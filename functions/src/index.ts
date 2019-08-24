import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as diff from 'diff'
import { getRegion } from './region'

const region = getRegion()
admin.initializeApp()

function serializeDiff (diffResult: diff.Change[]) {
  return diffResult.map((d) => {
    if (d.added) {
      return { type: 'added', value: d.value }
    } else if (d.removed) {
      return { type: 'removed', value: d.value }
    } else {
      return { type: 'identical', value: d.value }
    }
  })
}

export const storePhraseChangeHistory = functions
  .region(region)
  .firestore.document('phrases/{phraseHash}')
  .onWrite(async (snapshot) => {
    const before = snapshot.before.data()
    const after = snapshot.after.data()!
    const ts: admin.firestore.Timestamp = after.translatedAt
    const historyId = ts.toMillis().toString()
    const diffResult = diff.diffChars(before ? before.translatedText : '', after.translatedText)
    const authUser = await admin.auth().getUser(after.user.id)
    const githubData = authUser.providerData.find((d) => d.providerId === 'github.com')

    const history = {
      ...after,
      diff: diffResult ? serializeDiff(diffResult) : null,
      user: {
        id: authUser.uid,
        githubId: githubData!.uid,
        ...(await after.user.get()).data() || {},
      },
    }

    await snapshot.after.ref.collection('history').doc(historyId).set(history, { merge: true })
    await admin.firestore().collection('histories').doc(historyId).set(history, { merge: true })
  })

export const downloadPhrases = functions
  .region(region)
  .https.onRequest(async (_, response) => {
    const phrasesReference = admin.firestore().collection('phrases')
    const phrasesSnapshot = await phrasesReference.get()
    const phrases = await Promise.all(phrasesSnapshot.docs.map(async (doc) => ({
      id: doc.id,
      ...doc.data(),
      translators: (await doc.ref.collection('histories').get()).docs.map((t) => t.data()),
    })))
    response.send({ phrases })
  })
