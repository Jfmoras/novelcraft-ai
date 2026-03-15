export const GENRES = [
  'Fiction', 'Sci-Fi', 'Psychological Thriller', 'Thriller', 'Mystery',
  'Action', 'Adventure', 'Crime', 'Smut', 'Romance', 'Adult',
  'Historical Fiction', 'Dystopian', 'Young Adult',
  'Fantasy', 'Horror', 'Historical', 'Western', 'Biography'
];

export const PAGE_COUNTS = [10, 50, 100, 200, 500, 800];

export const CHARACTER_ARCHETYPES = {
  "General": [
    'Protagonist', 'Antagonist', 'Side Character', 'Secondary Protagonist',
    'Puppet Master', 'The Rat', 'Love Interest', 'Mentor', 'Foil',
    'Anti-hero', 'Deceiver', 'Trickster', 'Redeemed Villain',
    'The Comic Relief', 'The Tragic Hero'
  ],
  "Action / Fantasy": [
    'The Stoic Warrior', 'The Reluctant Hero', 'The Dark Lord', 
    'The Wise Wizard', 'The Rogue', 'The Chosen One', 'The Loyal Sidekick'
  ],
  "Romance / Thriller": [
    'The Femme Fatale', 'The Brooding Love Interest', 'The Obsessive Stalker', 
    'The Girl Next Door', 'The Secret Billionaire', 'The Grumpy Boss'
  ],
  "Dan Brown Style": [
    'Everyman Intellectual', 'Cerebral Female Partner', 'Muscle Villain', 
    'Shadowy Puppet Master', 'Red Herring', 'Iconic Specialized Villain'
  ],
  "George R.R. Martin Style": [
    'Nuanced Hero/Heroine', 'Gray Perspective Character', 'Cynical Politician/Survivor',
    'Outcast/Underdog', 'Reluctant Protector', 'Subverted Archetype'
  ],
  "Freida McFadden Style": [
    'Unreliable Narrator', 'Unhinged/Chaotic Woman', 'Vulnerable Underdog',
    'Manipulative/Predatory Figure', 'Picture Perfect Liar', 'Naïve/Observant Innocent',
    'Medical/Professional Personnel'
  ],
  "J.K. Rowling / YA Fantasy": [
    'The Chosen One', 'The Loyal Sidekick', 'The Wise Mentor', 
    'The Bully/Rival', 'The Misunderstood Outcast'
  ],
  "Agatha Christie / Mystery": [
    'The Eccentric Detective', 'The Watson/Companion', 'The Least Likely Suspect',
    'The Femme Fatale', 'The Butler/Servant'
  ],
  "Stephen King / Horror": [
    'The Flawed Everyman', 'The Child with Powers', 'The Religious Fanatic',
    'The Bully', 'The Ancient Evil'
  ]
};

// Flattened list for easy checking if needed, or for simple selects
export const ALL_CHARACTER_TYPES = Array.from(new Set(Object.values(CHARACTER_ARCHETYPES).flat()));
