import type { AreaKey } from "@/lib/areas";

export interface Quote {
  text: string;
  author: string;
  source?: string;
  /** Life areas the quote speaks to; it is a candidate whenever one of them is the user's weakest area. */
  areas: AreaKey[];
}

/**
 * Public-domain, verifiable quotes only. Where the attribution is uncertain the author is "Proverb".
 * Every area has at least five.
 */
export const QUOTES: readonly Quote[] = [
  // Health
  { text: "A sound mind in a sound body.", author: "Juvenal", source: "Satires 10", areas: ["health", "mind"] },
  { text: "The first wealth is health.", author: "Ralph Waldo Emerson", source: "The Conduct of Life", areas: ["health"] },
  { text: "Sleep is the golden chain that ties health and our bodies together.", author: "Thomas Dekker", source: "The Honest Whore", areas: ["health"] },
  { text: "Health is the greatest gift, contentment the greatest wealth.", author: "Buddha", source: "Dhammapada 204", areas: ["health", "money"] },
  { text: "Early to bed and early to rise makes a man healthy, wealthy, and wise.", author: "Benjamin Franklin", source: "Poor Richard's Almanack", areas: ["health", "money"] },
  { text: "Those who think they have no time for exercise will sooner or later have to find time for illness.", author: "Edward Stanley, Earl of Derby", areas: ["health"] },
  { text: "Rest is not idleness, and to lie sometimes on the grass under trees on a summer's day is by no means a waste of time.", author: "John Lubbock", source: "The Use of Life", areas: ["health", "mind"] },

  // Mind
  { text: "We suffer more often in imagination than in reality.", author: "Seneca", source: "Letters 13", areas: ["mind"] },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche", source: "Twilight of the Idols", areas: ["mind", "growth"] },
  { text: "Men are disturbed not by things, but by the views which they take of them.", author: "Epictetus", source: "Enchiridion 5", areas: ["mind"] },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius", source: "Meditations 7.67", areas: ["mind"] },
  { text: "The soul becomes dyed with the colour of its thoughts.", author: "Marcus Aurelius", source: "Meditations 5.16", areas: ["mind"] },
  { text: "Nothing can bring you peace but yourself.", author: "Ralph Waldo Emerson", source: "Self-Reliance", areas: ["mind"] },
  { text: "No man is free who is not master of himself.", author: "Epictetus", areas: ["mind", "work"] },

  // Relationships
  { text: "A friend is another self.", author: "Aristotle", source: "Nicomachean Ethics 9.4", areas: ["relationships"] },
  { text: "Without friends no one would choose to live, though he had all other goods.", author: "Aristotle", source: "Nicomachean Ethics 8.1", areas: ["relationships"] },
  { text: "The only way to have a friend is to be one.", author: "Ralph Waldo Emerson", source: "Friendship", areas: ["relationships"] },
  { text: "No one is useless in this world who lightens the burden of it for anyone else.", author: "Charles Dickens", source: "Our Mutual Friend", areas: ["relationships"] },
  { text: "We are made for cooperation, like feet, like hands, like eyelids, like the rows of the upper and lower teeth.", author: "Marcus Aurelius", source: "Meditations 2.1", areas: ["relationships", "work"] },
  { text: "Love all, trust a few, do wrong to none.", author: "William Shakespeare", source: "All's Well That Ends Well", areas: ["relationships"] },
  { text: "Be kind, for everyone you meet is fighting a hard battle.", author: "Ian Maclaren", areas: ["relationships", "mind"] },

  // Work
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius", source: "Meditations 5.20", areas: ["work"] },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus", source: "Discourses 3.23", areas: ["work", "growth"] },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca", source: "On the Shortness of Life", areas: ["work"] },
  { text: "Waste no more time arguing what a good man should be. Be one.", author: "Marcus Aurelius", source: "Meditations 10.16", areas: ["work", "mind"] },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant", source: "The Story of Philosophy", areas: ["work", "growth"] },
  { text: "Nothing will ever be attempted if all possible objections must first be overcome.", author: "Samuel Johnson", source: "Rasselas", areas: ["work"] },
  { text: "Nothing great was ever achieved without enthusiasm.", author: "Ralph Waldo Emerson", source: "Circles", areas: ["work"] },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt", source: "An Autobiography", areas: ["work", "money"] },
  { text: "Genius is one per cent inspiration, ninety-nine per cent perspiration.", author: "Thomas Edison", areas: ["work"] },

  // Money
  { text: "Do not spoil what you have by desiring what you have not.", author: "Epicurus", areas: ["money", "mind"] },
  { text: "Beware of little expenses; a small leak will sink a great ship.", author: "Benjamin Franklin", source: "Poor Richard's Almanack", areas: ["money"] },
  { text: "It is not the man who has too little, but the man who craves more, that is poor.", author: "Seneca", source: "Letters 2", areas: ["money", "mind"] },
  { text: "Never spend your money before you have it.", author: "Thomas Jefferson", source: "Canons of Conduct", areas: ["money"] },
  { text: "The best time to plant a tree was twenty years ago. The second best time is now.", author: "Proverb", areas: ["money", "growth"] },
  { text: "A penny saved is a penny earned.", author: "Proverb", areas: ["money"] },
  { text: "Money is a good servant but a bad master.", author: "Proverb", areas: ["money"] },
  { text: "Take care of the pennies, and the pounds will take care of themselves.", author: "Proverb", areas: ["money"] },

  // Growth
  { text: "A journey of a thousand miles begins with a single step.", author: "Laozi", source: "Tao Te Ching 64", areas: ["growth", "work"] },
  { text: "Knowing is not enough; we must apply.", author: "Johann Wolfgang von Goethe", source: "Wilhelm Meister's Apprenticeship", areas: ["growth"] },
  { text: "It is not because things are difficult that we do not dare; it is because we do not dare that they are difficult.", author: "Seneca", source: "Letters 104", areas: ["growth"] },
  { text: "Be not afraid of growing slowly; be afraid only of standing still.", author: "Proverb", areas: ["growth", "health"] },
  { text: "Learning without thought is labour lost; thought without learning is perilous.", author: "Confucius", source: "Analects 2.15", areas: ["growth"] },
  { text: "What we have to learn to do, we learn by doing.", author: "Aristotle", source: "Nicomachean Ethics 2.1", areas: ["growth"] },
  { text: "A man who moves a mountain begins by carrying away small stones.", author: "Proverb", areas: ["growth", "work"] },
  { text: "Fall seven times, stand up eight.", author: "Proverb", areas: ["growth", "mind"] },
  { text: "To know what you know and what you do not know, that is true knowledge.", author: "Confucius", source: "Analects 2.17", areas: ["growth"] },
] as const;
