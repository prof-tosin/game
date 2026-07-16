let allQuestions = [];
let quizQuestions = [];
let currentIndex = 0;
let score = 0;
let bestScores = {};

const el = {
  startScreen: document.getElementById('startScreen'),
  quizScreen: document.getElementById('quizScreen'),
  resultScreen: document.getElementById('resultScreen'),
  categoryList: document.getElementById('categoryList'),
  progress: document.getElementById('progress'),
  questionText: document.getElementById('questionText'),
  optionsList: document.getElementById('optionsList'),
  nextBtn: document.getElementById('nextBtn'),
  scoreDisplay: document.getElementById('scoreDisplay'),
  resultHeadline: document.getElementById('resultHeadline'),
  resultDetail: document.getElementById('resultDetail'),
  restartBtn: document.getElementById('restartBtn')
};

function shuffle(arr){
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadBestScores(){
  try{
    bestScores = JSON.parse(localStorage.getItem('bibleTriviaBest') || '{}');
  } catch { bestScores = {}; }
}

function saveBestScore(category, pct){
  if (!bestScores[category] || pct > bestScores[category]){
    bestScores[category] = pct;
    localStorage.setItem('bibleTriviaBest', JSON.stringify(bestScores));
  }
}

async function init(){
  loadBestScores();
  try{
    const res = await fetch('questions.json');
    allQuestions = await res.json();
  } catch (e){
    el.categoryList.innerHTML = '<p>Could not load questions.</p>';
    return;
  }
  renderCategoryList();
}

function renderCategoryList(){
  const categories = ['All', ...new Set(allQuestions.map(q => q.category))];
  el.categoryList.innerHTML = '';
  categories.forEach(cat => {
    const count = cat === 'All' ? allQuestions.length : allQuestions.filter(q => q.category === cat).length;
    const best = bestScores[cat];
    const btn = document.createElement('button');
    btn.innerHTML = `<span>${cat}</span><span class="count">${count} Q${best ? ' · best ' + best + '%' : ''}</span>`;
    btn.addEventListener('click', () => startQuiz(cat));
    el.categoryList.appendChild(btn);
  });
}

function startQuiz(category){
  const pool = category === 'All' ? allQuestions : allQuestions.filter(q => q.category === category);
  quizQuestions = shuffle(pool).slice(0, Math.min(10, pool.length));
  currentIndex = 0;
  score = 0;
  quizQuestions._category = category;

  el.startScreen.hidden = true;
  el.resultScreen.hidden = true;
  el.quizScreen.hidden = false;
  updateScoreDisplay();
  showQuestion();
}

function updateScoreDisplay(){
  el.scoreDisplay.textContent = quizQuestions.length ? `${score}/${quizQuestions.length}` : '';
}

function showQuestion(){
  const q = quizQuestions[currentIndex];
  el.progress.textContent = `Question ${currentIndex + 1} of ${quizQuestions.length} · ${q.category}`;
  el.questionText.textContent = q.question;
  el.nextBtn.hidden = true;

  const opts = shuffle(q.options);
  el.optionsList.innerHTML = '';
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.addEventListener('click', () => selectAnswer(btn, opt, q.answer));
    el.optionsList.appendChild(btn);
  });
}

function selectAnswer(btn, chosen, correctAnswer){
  const buttons = [...el.optionsList.children];
  buttons.forEach(b => b.disabled = true);

  if (chosen === correctAnswer){
    btn.classList.add('correct');
    score++;
  } else {
    btn.classList.add('incorrect');
    const correctBtn = buttons.find(b => b.textContent === correctAnswer);
    if (correctBtn) correctBtn.classList.add('correct');
  }
  updateScoreDisplay();
  el.nextBtn.hidden = false;
}

el.nextBtn.addEventListener('click', () => {
  currentIndex++;
  if (currentIndex >= quizQuestions.length){
    finishQuiz();
  } else {
    showQuestion();
  }
});

function finishQuiz(){
  const pct = Math.round((score / quizQuestions.length) * 100);
  saveBestScore(quizQuestions._category, pct);

  el.quizScreen.hidden = true;
  el.resultScreen.hidden = false;

  let headline;
  if (pct === 100) headline = 'Perfect score! 🎉';
  else if (pct >= 70) headline = 'Well done!';
  else if (pct >= 40) headline = 'Good effort.';
  else headline = 'Keep studying and try again.';

  el.resultHeadline.textContent = headline;
  el.resultDetail.textContent = `You scored ${score} out of ${quizQuestions.length} (${pct}%).`;
}

el.restartBtn.addEventListener('click', () => {
  el.resultScreen.hidden = true;
  el.startScreen.hidden = false;
  el.scoreDisplay.textContent = '';
  renderCategoryList();
});

init();
