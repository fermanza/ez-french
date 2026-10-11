export interface VocabularyEntry {
  french: string;
  english: string;
}

interface ExerciseBase {
  id: string;
  prompt: string;
  explanation: string;
}

export interface ChoiceExercise extends ExerciseBase {
  type: 'choice';
  options: string[];
  answer: string;
}

export interface TranslateExercise extends ExerciseBase {
  type: 'translate';
  acceptedAnswers: string[];
  placeholder: string;
}

export interface ArrangeExercise extends ExerciseBase {
  type: 'arrange';
  words: string[];
  acceptedAnswers: string[];
}

export type Exercise = ChoiceExercise | TranslateExercise | ArrangeExercise;

export interface Lesson {
  id: string;
  title: string;
  description: string;
  unit: number;
  unitTitle: string;
  duration: number;
  xp: number;
  icon: string;
  vocabulary: VocabularyEntry[];
  exercises: Exercise[];
}

const choice = (
  id: string,
  prompt: string,
  options: string[],
  answer: string,
  explanation: string,
): ChoiceExercise => ({ id, type: 'choice', prompt, options, answer, explanation });

const translate = (
  id: string,
  prompt: string,
  acceptedAnswers: string[],
  explanation: string,
): TranslateExercise => ({
  id, type: 'translate', prompt, acceptedAnswers, explanation,
  placeholder: 'Type your answer in French…',
});

const arrange = (
  id: string,
  prompt: string,
  words: string[],
  acceptedAnswers: string[],
  explanation: string,
): ArrangeExercise => ({ id, type: 'arrange', prompt, words, acceptedAnswers, explanation });

export const lessons: Lesson[] = [
  {
    id: 'bonjour', title: 'Say bonjour', description: 'A little hello goes a long way.',
    unit: 1, unitTitle: 'First words', duration: 4, xp: 30, icon: 'chat',
    vocabulary: [
      { french: 'Bonjour', english: 'Hello / good morning' },
      { french: 'Salut', english: 'Hi / bye (informal)' },
      { french: 'Bonsoir', english: 'Good evening' },
      { french: 'Au revoir', english: 'Goodbye' },
      { french: 'À bientôt', english: 'See you soon' },
    ],
    exercises: [
      choice('bonjour-1', 'How do you say “hello” in French?', ['Bonjour', 'Merci', 'Au revoir', 'Bonne nuit'], 'Bonjour', 'Bonjour is the everyday way to greet someone.'),
      choice('bonjour-2', 'What does “bonsoir” mean?', ['Good morning', 'Good evening', 'Goodbye', 'Thank you'], 'Good evening', 'Use bonsoir when greeting someone in the evening.'),
      translate('bonjour-3', 'Translate: Goodbye.', ['Au revoir', 'Salut'], 'Au revoir means goodbye. Salut works informally with friends.'),
      arrange('bonjour-4', 'Arrange: See you soon.', ['bientôt', 'À'], ['À bientôt'], 'À bientôt is a friendly way to say see you soon.'),
      choice('bonjour-5', 'Which greeting is informal?', ['Salut', 'Bonsoir', 'Bonjour', 'Bonne nuit'], 'Salut', 'Salut is a casual hi or bye, usually with someone you know.'),
      translate('bonjour-6', 'Translate: Good evening.', ['Bonsoir'], 'Bonsoir is an evening greeting. Bonne soirée wishes someone a pleasant evening as you leave.'),
    ],
  },
  {
    id: 'introductions', title: 'Nice to meet you', description: 'Introduce yourself, one sentence at a time.',
    unit: 1, unitTitle: 'First words', duration: 5, xp: 35, icon: 'sparkles',
    vocabulary: [
      { french: "Je m'appelle…", english: 'My name is…' },
      { french: 'Enchanté / enchantée', english: 'Nice to meet you' },
      { french: 'Comment tu t’appelles ?', english: 'What is your name? (informal)' },
      { french: 'Je suis…', english: 'I am…' },
      { french: 'français / française', english: 'French (person / adjective)' },
    ],
    exercises: [
      choice('introductions-1', 'What does “Je m’appelle Camille” mean?', ['I am from Paris', 'My name is Camille', 'I like Camille', 'Goodbye, Camille'], 'My name is Camille', 'Je m’appelle literally means I call myself.'),
      translate('introductions-2', 'Translate: My name is Camille.', ["Je m'appelle Camille", 'Mon nom est Camille'], 'Je m’appelle Camille is the natural everyday introduction.'),
      arrange('introductions-3', 'Arrange: I am French. (a man speaking)', ['français', 'suis', 'Je'], ['Je suis français'], 'Je suis means I am; français is the masculine form.'),
      choice('introductions-4', 'How can a woman say “nice to meet you”?', ['Enchantée', 'À bientôt', 'Bonsoir', 'De rien'], 'Enchantée', 'Enchantée is the feminine spelling. Enchanté is the masculine spelling.'),
      translate('introductions-5', 'Ask a friend: What is your name?', ["Comment tu t'appelles", "Comment t'appelles-tu", 'Quel est ton nom'], 'Comment tu t’appelles ? is common in spoken French. Comment t’appelles-tu ? is also correct.'),
      arrange('introductions-6', 'Arrange: My name is Léa.', ['Léa', 'Je', "m'appelle"], ["Je m'appelle Léa"], 'Keep Je and m’appelle together, then add the name.'),
    ],
  },
  {
    id: 'politeness', title: 'The magic words', description: 'Merci, please, and the little things that matter.',
    unit: 1, unitTitle: 'First words', duration: 4, xp: 30, icon: 'heart',
    vocabulary: [
      { french: 'Merci', english: 'Thank you' },
      { french: 'S’il vous plaît', english: 'Please (formal / plural)' },
      { french: 'S’il te plaît', english: 'Please (informal singular)' },
      { french: 'De rien', english: 'You’re welcome' },
      { french: 'Pardon', english: 'Sorry / excuse me' },
      { french: 'Oui / non', english: 'Yes / no' },
    ],
    exercises: [
      choice('politeness-1', 'Someone helps you. What do you say?', ['Merci', 'Non', 'Bonsoir', 'Au revoir'], 'Merci', 'Merci means thank you.'),
      translate('politeness-2', 'Translate: Thank you very much.', ['Merci beaucoup', 'Je vous remercie beaucoup', 'Je te remercie beaucoup'], 'Add beaucoup to merci to say thank you very much.'),
      arrange('politeness-3', 'Arrange: Please. (formal)', ['plaît', 'vous', "S'il"], ["S'il vous plaît"], 'S’il vous plaît uses the formal or plural vous.'),
      choice('politeness-4', 'What does “de rien” mean?', ['Please', 'Yes', 'You’re welcome', 'Excuse me'], 'You’re welcome', 'De rien is a common response to merci.'),
      translate('politeness-5', 'Translate: Yes, please.', ["Oui, s'il vous plaît", "Oui, s'il te plaît"], 'Both vous and te are correct here. Choose vous in a formal situation.'),
      arrange('politeness-6', 'Arrange: No, thank you.', ['merci', 'Non'], ['Non, merci'], 'Non, merci politely declines something.'),
    ],
  },
  {
    id: 'numbers', title: 'One, two, trois', description: 'Count your first steps in French.',
    unit: 1, unitTitle: 'First words', duration: 5, xp: 35, icon: 'clock',
    vocabulary: [
      { french: 'un, deux, trois', english: 'one, two, three' },
      { french: 'quatre, cinq, six', english: 'four, five, six' },
      { french: 'sept, huit, neuf, dix', english: 'seven, eight, nine, ten' },
      { french: 'J’ai…', english: 'I have…' },
      { french: 'un livre / des livres', english: 'a book / books' },
    ],
    exercises: [
      choice('numbers-1', 'Which French word means “three”?', ['Deux', 'Trois', 'Cinq', 'Dix'], 'Trois', 'Un, deux, trois: one, two, three.'),
      translate('numbers-2', 'Write the number 5 as a French word.', ['Cinq'], 'Five is cinq.'),
      arrange('numbers-3', 'Arrange: I have two books.', ['livres', "J'ai", 'deux'], ["J'ai deux livres"], 'J’ai means I have. With two, livre becomes the plural livres.'),
      choice('numbers-4', 'What number is “huit”?', ['4', '6', '8', '10'], '8', 'Huit is eight; neuf is nine and dix is ten.'),
      translate('numbers-5', 'Write the number 10 as a French word.', ['Dix'], 'Ten is dix.'),
      arrange('numbers-6', 'Arrange: I have one book.', ['livre', 'un', "J'ai"], ["J'ai un livre"], 'Un livre is one book. Livre stays singular.'),
    ],
  },
  {
    id: 'cafe', title: 'At the café', description: 'Your first coffee order, en français.',
    unit: 2, unitTitle: 'Everyday life', duration: 5, xp: 35, icon: 'coffee',
    vocabulary: [
      { french: 'un café', english: 'a coffee' },
      { french: 'un thé', english: 'a tea' },
      { french: 'de l’eau', english: 'some water' },
      { french: 'un croissant', english: 'a croissant' },
      { french: 'Je voudrais…', english: 'I would like…' },
      { french: 'L’addition, s’il vous plaît', english: 'The bill, please' },
    ],
    exercises: [
      choice('cafe-1', 'Which drink is “un thé”?', ['A coffee', 'A tea', 'Some water', 'A juice'], 'A tea', 'Thé is tea; café is coffee.'),
      translate('cafe-2', 'Translate: A coffee, please.', ["Un café, s'il vous plaît", "Un café, s'il te plaît"], 'Un café, s’il vous plaît is a simple polite order.'),
      arrange('cafe-3', 'Arrange: I would like a croissant.', ['croissant', 'voudrais', 'Je', 'un'], ['Je voudrais un croissant'], 'Je voudrais means I would like, a polite way to order.'),
      choice('cafe-4', 'What does “l’addition” mean in a restaurant?', ['The menu', 'The table', 'The bill', 'The waiter'], 'The bill', 'Ask for l’addition when you are ready to pay.'),
      translate('cafe-5', 'Translate: I would like some water.', ["Je voudrais de l'eau", "J'aimerais de l'eau"], 'Use de l’eau for some water. Je voudrais is a polite request.'),
      arrange('cafe-6', 'Arrange: A tea, please. (formal)', ['vous', 'thé', 'Un', "s'il", 'plaît'], ["Un thé, s'il vous plaît"], 'The drink comes first, followed by s’il vous plaît.'),
    ],
  },
  {
    id: 'family', title: 'Your favorite people', description: 'Talk about family and friends.',
    unit: 2, unitTitle: 'Everyday life', duration: 5, xp: 35, icon: 'users',
    vocabulary: [
      { french: 'ma mère', english: 'my mother' },
      { french: 'mon père', english: 'my father' },
      { french: 'mon frère', english: 'my brother' },
      { french: 'ma sœur', english: 'my sister' },
      { french: 'un ami / une amie', english: 'a friend (male / female)' },
      { french: 'C’est…', english: 'This is… / it is…' },
    ],
    exercises: [
      choice('family-1', 'Who is “ma mère”?', ['My father', 'My mother', 'My sister', 'My friend'], 'My mother', 'Mère means mother. Use ma with the feminine noun mère.'),
      translate('family-2', 'Translate: My father.', ['Mon père'], 'Père is masculine, so use mon père.'),
      arrange('family-3', 'Arrange: This is my sister.', ['sœur', "C'est", 'ma'], ["C'est ma sœur", "C'est ma soeur"], 'C’est introduces someone. Sœur means sister.'),
      choice('family-4', 'Which phrase means “a female friend”?', ['Un frère', 'Une amie', 'Un père', 'Une mère'], 'Une amie', 'Une amie is a female friend; un ami is a male friend.'),
      translate('family-5', 'Translate: I have a brother.', ["J'ai un frère"], 'J’ai un frère means I have a brother.'),
      arrange('family-6', 'Arrange: This is my mother.', ['ma', 'mère', "C'est"], ["C'est ma mère"], 'Ma mère means my mother.'),
    ],
  },
  {
    id: 'city', title: 'A little exploring', description: 'Find your way through a French city.',
    unit: 2, unitTitle: 'Everyday life', duration: 5, xp: 40, icon: 'map',
    vocabulary: [
      { french: 'la gare', english: 'the train station' },
      { french: 'le musée', english: 'the museum' },
      { french: 'à gauche', english: 'to the left / on the left' },
      { french: 'à droite', english: 'to the right / on the right' },
      { french: 'tout droit', english: 'straight ahead' },
      { french: 'Où est… ?', english: 'Where is…?' },
    ],
    exercises: [
      choice('city-1', 'What is “la gare”?', ['The museum', 'The train station', 'The school', 'The café'], 'The train station', 'La gare is the train station.'),
      translate('city-2', 'Translate: Where is the train station?', ['Où est la gare', 'La gare est où'], 'Où means where. Où est la gare ? asks for the station’s location.'),
      arrange('city-3', 'Arrange: The museum is on the left.', ['gauche', 'musée', 'à', 'Le', 'est'], ['Le musée est à gauche'], 'Le musée is masculine; à gauche means on the left.'),
      choice('city-4', 'What direction is “tout droit”?', ['Left', 'Right', 'Straight ahead', 'Back'], 'Straight ahead', 'Tout droit means straight ahead; à droite means to the right.'),
      translate('city-5', 'Translate: On the right.', ['À droite', 'Sur la droite'], 'À droite means on the right or to the right.'),
      arrange('city-6', 'Arrange: Where is the museum?', ['le', 'Où', 'musée', 'est'], ['Où est le musée'], 'Start with Où est, then name the place.'),
    ],
  },
  {
    id: 'routines', title: 'A day in your life', description: 'Small sentences for your everyday routine.',
    unit: 2, unitTitle: 'Everyday life', duration: 6, xp: 40, icon: 'sun',
    vocabulary: [
      { french: 'Je mange', english: 'I eat / I am eating' },
      { french: 'Je travaille', english: 'I work / I am working' },
      { french: 'Je lis', english: 'I read / I am reading' },
      { french: 'Je dors', english: 'I sleep / I am sleeping' },
      { french: 'J’étudie le français', english: 'I study French' },
      { french: 'le matin / le soir', english: 'in the morning / in the evening' },
    ],
    exercises: [
      choice('routines-1', 'What does “je travaille” mean?', ['I eat', 'I sleep', 'I work', 'I read'], 'I work', 'Travailler means to work. With je, use travaille.'),
      translate('routines-2', 'Translate: I study French.', ["J'étudie le français", "J'apprends le français"], 'J’étudie le français means I study French. J’apprends le français means I am learning French.'),
      arrange('routines-3', 'Arrange: I eat in the morning.', ['matin', 'Je', 'le', 'mange'], ['Je mange le matin'], 'Le matin means in the morning when describing a routine.'),
      choice('routines-4', 'Which sentence means “I am reading”?', ['Je dors', 'Je lis', 'Je mange', 'Je travaille'], 'Je lis', 'The French present tense can mean I read or I am reading.'),
      translate('routines-5', 'Translate: I sleep.', ['Je dors'], 'Dormir becomes dors with je: je dors.'),
      arrange('routines-6', 'Arrange: I read in the evening.', ['soir', 'lis', 'Je', 'le'], ['Je lis le soir'], 'Le soir means in the evening. You can now describe your day in French!'),
    ],
  },
];
