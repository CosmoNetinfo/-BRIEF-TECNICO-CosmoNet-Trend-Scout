import { db } from '../firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const TOPIC_TO_CAT = {
  ai:         'ai',
  linux:      'linux',
  opensource: 'oss',
  gaming:     'gaming',
  wordpress:  'tools',
};

const URGENZA_TO_DIFF = {
  alta:  'alta',
  media: 'media',
  bassa: 'bassa',
};

export async function saveIdeaToPiano(article, topicId) {
  const now = new Date();

  return addDoc(collection(db, 'piano_editoriale'), {
    title:       article.title,
    kw:          article.keyword_principale || '',
    cat:         TOPIC_TO_CAT[topicId] || 'ai',
    diff:        URGENZA_TO_DIFF[article.urgenza] || 'media',
    tipo:        article.tipo || 'Articolo',
    month:       now.getMonth() + 1,
    year:        now.getFullYear(),
    status:      'da_scrivere',
    source:      'trend-scout',
    description:        article.rationale || '',
    keywords_secondarie: article.keywords_secondarie || [],
    news_riferimento:   article.news_di_riferimento || null,
    stima_traffico:     article.stima_traffico || 'medio',
    createdAt: serverTimestamp(),
  });
}

export async function saveAllIdeas(articles, topicId, existingTitles = new Set()) {
  const toSave = articles.filter(a =>
    !existingTitles.has(a.title?.toLowerCase())
  );

  const results = await Promise.allSettled(
    toSave.map(a => saveIdeaToPiano(a, topicId))
  );

  const saved = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return { saved, failed, skipped: articles.length - toSave.length };
}
