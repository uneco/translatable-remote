import * as firebase from '@firebase/testing'
import * as fs from 'fs'

const projectId = 'translatable-remote'
const firebasePort = require('../firebase.json').emulators.firestore.port
const port = firebasePort ? firebasePort : 8080
const coverageUrl = `http://localhost:${port}/emulator/v1/projects/${projectId}:ruleCoverage.html`

console.log({ port, coverageUrl })

const rules = fs.readFileSync('./firestore.rules', 'utf8')

function authedApp(auth: any) {
  return firebase.initializeTestApp({ projectId, auth }).firestore()
}

beforeEach(async () => {
  await firebase.clearFirestoreData({ projectId })
})

beforeAll(async () => {
  await firebase.loadFirestoreRules({ projectId, rules })
})

afterAll(async () => {
  await Promise.all(firebase.apps().map(app => app.delete()))
  console.log(`View rule coverage information at ${coverageUrl}\n`)
})

describe('Rules', () => {
  describe('users', () => {
    it('write succeeds', async () => {
      const database = authedApp({ uid: 'abcd' })
      const user = database.collection('users').doc('abcd')
      await firebase.assertSucceeds(user.set({
        displayName: 'roachan',
        photoURL: 'https://avatars3.githubusercontent.com/u/603523?s=460&v=4',
      }))
    })
    it('write fails without auth', async () => {
      const database = authedApp(null)
      const user = database.collection('users').doc('abcd')
      await firebase.assertFails(user.set({
        displayName: 'roachan',
        photoURL: 'https://avatars3.githubusercontent.com/u/603523?s=460&v=4',
      }))
    })
    it('write fails with auth that difference uid', async () => {
      const database = authedApp({ uid: '1234' })
      const user = database.collection('users').doc('abcd')
      await firebase.assertFails(user.set({
        displayName: 'roachan',
        photoURL: 'https://avatars3.githubusercontent.com/u/603523?s=460&v=4',
      }))
    })
    describe('with invalid property', () => {
      describe('displayName', () => {
        it('not given', async () => {
          const database = authedApp({ uid: 'abcd' })
          const user = database.collection('users').doc('abcd')
          await firebase.assertFails(user.set({
            photoURL: 'https://avatars3.githubusercontent.com/u/603523?s=460&v=4',
          }))
        })
        it('empty', async () => {
          const database = authedApp({ uid: 'abcd' })
          const user = database.collection('users').doc('abcd')
          await firebase.assertFails(user.set({
            displayName: '',
            photoURL: 'https://avatars3.githubusercontent.com/u/603523?s=460&v=4',
          }))
        })
        it('type difference', async () => {
          const database = authedApp({ uid: 'abcd' })
          const user = database.collection('users').doc('abcd')
          await firebase.assertFails(user.set({
            displayName: 1,
            photoURL: 'https://avatars3.githubusercontent.com/u/603523?s=460&v=4',
          }))
        })
        it('too long', async () => {
          const database = authedApp({ uid: 'abcd' })
          const user = database.collection('users').doc('abcd')
          await firebase.assertFails(user.set({
            displayName: 'long '.repeat(50) + ' name',
            photoURL: 'https://avatars3.githubusercontent.com/u/603523?s=460&v=4',
          }))
        })
      })
      describe('photoURL', () => {
        it('not given', async () => {
          const database = authedApp({ uid: 'abcd' })
          const user = database.collection('users').doc('abcd')
          await firebase.assertFails(user.set({
            displayName: 'roachan',
          }))
        })
        it('empty', async () => {
          const database = authedApp({ uid: 'abcd' })
          const user = database.collection('users').doc('abcd')
          await firebase.assertFails(user.set({
            displayName: 'roachan',
            photoURL: '',
          }))
        })
        it('too long', async () => {
          const database = authedApp({ uid: 'abcd' })
          const user = database.collection('users').doc('abcd')
          await firebase.assertFails(user.set({
            displayName: 'roachan',
            photoURL: 'https://avatars3.githubusercontent.com/u/603523?s=460&v=' + '0'.repeat(200),
          }))
        })
        it('not match', async () => {
          const database = authedApp({ uid: 'abcd' })
          const user = database.collection('users').doc('abcd')
          await firebase.assertFails(user.set({
            displayName: 'roachan',
            photoURL: 'https://via.placeholder.com/150',
          }))
        })
      })
    })
  })
  describe('phrases', () => {
    it('write succeeds', async () => {
      const database = authedApp({ uid: 'abcd' })
      const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
      await firebase.assertSucceeds(phrase.set({
        originalText: 'hello',
        translatedText: 'こんにちは',
        user: database.collection('users').doc('abcd'),
        translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }))
    })
    it('write fails without auth', async () => {
      const database = authedApp(null)
      const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
      await firebase.assertFails(phrase.set({
        originalText: 'hello',
        translatedText: 'こんにちは',
        user: database.collection('users').doc('abcd'),
        translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }))
    })
    it('write fails with invalid ID', async () => {
      const database = authedApp({ uid: 'abcd' })
      const phrase = database.collection('phrases').doc('da39a3ee5e6')
      await firebase.assertFails(phrase.set({
        originalText: 'hello',
        translatedText: 'こんにちは',
        user: database.collection('users').doc('abcd'),
        translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }))
    })
    describe('resource already existsing', () => {
      beforeEach(async () => {
        const database = firebase.initializeAdminApp({ projectId }).firestore()
        await database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709').set({
          originalText: 'hello',
          translatedText: 'こんにちは',
          user: database.collection('users').doc('abcd'),
          translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        })
      })
      it('write fails with same translatedText', async () => {
        const database = authedApp({ uid: 'abcd' })
        const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
        await firebase.assertFails(phrase.set({
          originalText: 'hello',
          translatedText: 'こんにちは',
          user: database.collection('users').doc('abcd'),
          translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        }))
      })
      it('write succeeds with different translatedText', async () => {
        const database = authedApp({ uid: 'abcd' })
        const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
        await firebase.assertSucceeds(phrase.set({
          originalText: 'hello',
          translatedText: 'こんにちは！',
          user: database.collection('users').doc('abcd'),
          translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        }))
      })
    })
    describe('with invalid property', () => {
      describe('originalText', () => {
        it('not given', async () => {
          const database = authedApp({ uid: 'abcd' })
          const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
          await firebase.assertFails(phrase.set({
            translatedText: 'こんにちは',
            user: database.collection('users').doc('abcd'),
            translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          }))
        })
        it('empty', async () => {
          const database = authedApp({ uid: 'abcd' })
          const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
          await firebase.assertFails(phrase.set({
            originalText: '',
            translatedText: 'こんにちは',
            user: database.collection('users').doc('abcd'),
            translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          }))
        })
        it('type difference', async () => {
          const database = authedApp({ uid: 'abcd' })
          const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
          await firebase.assertFails(phrase.set({
            originalText: 1,
            translatedText: 'こんにちは',
            user: database.collection('users').doc('abcd'),
            translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          }))
        })
        it('too long', async () => {
          const database = authedApp({ uid: 'abcd' })
          const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
          await firebase.assertFails(phrase.set({
            originalText: 'hello'.repeat(5000),
            translatedText: 'こんにちは',
            user: database.collection('users').doc('abcd'),
            translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          }))
        })
      })
      describe('translatedText', () => {
        it('not given', async () => {
          const database = authedApp({ uid: 'abcd' })
          const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
          await firebase.assertFails(phrase.set({
            originalText: 'hello',
            user: database.collection('users').doc('abcd'),
            translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          }))
        })
        it('empty', async () => {
          const database = authedApp({ uid: 'abcd' })
          const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
          await firebase.assertFails(phrase.set({
            originalText: 'hello',
            translatedText: '',
            user: database.collection('users').doc('abcd'),
            translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          }))
        })
        it('type difference', async () => {
          const database = authedApp({ uid: 'abcd' })
          const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
          await firebase.assertFails(phrase.set({
            originalText: 'hello',
            translatedText: 1,
            user: database.collection('users').doc('abcd'),
            translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          }))
        })
        it('too long', async () => {
          const database = authedApp({ uid: 'abcd' })
          const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
          await firebase.assertFails(phrase.set({
            originalText: 'hello',
            translatedText: 'こんにちは'.repeat(5000),
            user: database.collection('users').doc('abcd'),
            translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          }))
        })
      })
      describe('translatedAt', () => {
        it('not given', async () => {
          const database = authedApp({ uid: 'abcd' })
          const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
          await firebase.assertFails(phrase.set({
            originalText: 'hello',
            translatedText: 'こんにちは',
            user: database.collection('users').doc('abcd'),
          }))
        })
        it('type difference', async () => {
          const database = authedApp({ uid: 'abcd' })
          const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
          await firebase.assertFails(phrase.set({
            originalText: 'hello',
            translatedText: 'こんにちは',
            user: database.collection('users').doc('abcd'),
            translatedAt: 1,
          }))
        })
      })
      describe('user', () => {
        it('not given', async () => {
          const database = authedApp({ uid: 'abcd' })
          const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
          await firebase.assertFails(phrase.set({
            originalText: 'hello',
            translatedText: 'こんにちは',
            translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          }))
        })
        it('type difference', async () => {
          const database = authedApp({ uid: 'abcd' })
          const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
          await firebase.assertFails(phrase.set({
            originalText: 'hello',
            translatedText: 'こんにちは',
            user: 1,
            translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          }))
        })
        it('another id', async () => {
          const database = authedApp({ uid: 'abcd' })
          const phrase = database.collection('phrases').doc('da39a3ee5e6b4b0d3255bfef95601890afd80709')
          await firebase.assertFails(phrase.set({
            originalText: 'hello',
            translatedText: 'こんにちは',
            user: database.collection('users').doc('efgh'),
            translatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          }))
        })
      })
    })
  })
  describe('histories', () => {
    it('write fails', async () => {
      const database = authedApp({ uid: 'abcd' })
      const history = database.collection('histories').doc('1234')
      await firebase.assertFails(history.set({
        translatedText: 'こんにちは',
      }))
    })
    it('read succeeds', async () => {
      const database = authedApp({ uid: 'abcd' })
      const history = database.collection('histories').doc('1234')
      await firebase.assertSucceeds(history.get())
    })
  })
})
