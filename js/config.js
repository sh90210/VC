// Everything the app knows about sports lives here.
// To add a sport: add an entry to SPORTS, drop its data in data/<id>/,
// and (if it needs different screens) add view files under js/views/<sport>/.

// Tabs shown at the bottom of a competition. "icon" names live in ui.js.
export const VIEWS = {
  overview: { label: 'Overview', icon: 'home' },
  results: { label: 'Results', icon: 'ball' },
  table: { label: 'Table', icon: 'table' },
  stats: { label: 'Stats', icon: 'star' },
  bracket: { label: 'Bracket', icon: 'bracket' },
};

export const SPORTS = [
  {
    id: 'soccer',
    name: 'Soccer',
    emoji: '⚽',
    competitions: [
      {
        id: 'ucl',
        name: 'Champions League',
        blurb: 'The biggest club tournament in Europe',
        dataPath: 'data/ucl/',
        leagueMatchdays: 8,
        // Which file draws each tab (paths are inside js/views/).
        views: {
          overview: 'soccer/overview',
          results: 'soccer/results',
          table: 'soccer/table',
          stats: 'soccer/stats',
          bracket: 'soccer/bracket',
        },
        // Table colours: the places each colour covers and what they mean.
        zones: [
          { from: 1, to: 8, tone: 'grass', title: 'Round of 16', text: 'These teams skip the playoffs.' },
          { from: 9, to: 24, tone: 'sun', title: 'Playoffs', text: 'These teams play two extra games to stay in.' },
          { from: 25, to: 36, tone: 'coral', title: 'Out', text: 'These teams are knocked out.' },
        ],
        // Knockout rounds, in order, with how many ties each one has.
        rounds: [
          { key: 'playoffs', label: 'Playoffs', ties: 8 },
          { key: 'r16', label: 'Round of 16', ties: 8 },
          { key: 'qf', label: 'Quarter-finals', ties: 4 },
          { key: 'sf', label: 'Semi-finals', ties: 2 },
          { key: 'final', label: 'Final', ties: 1 },
        ],
      },
    ],
  },
];
