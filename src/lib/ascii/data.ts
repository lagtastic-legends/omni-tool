export interface AsciiArt {
  id: string;
  name: string;
  art: string;
}

export interface AsciiCategory {
  id: string;
  name: string;
  thumbnail: string;
  items: AsciiArt[];
}

export const ASCII_ARCHIVE: AsciiCategory[] = [
  {
    id: "animals",
    name: "Animals",
    thumbnail: `
 /\\_/\\
( o.o )
 > ^ <
    `.trim(),
    items: [
      {
        id: "cat",
        name: "Cat",
        art: `
 /\\_/\\
( o.o )
 > ^ <
        `.trim(),
      },
      {
        id: "dog",
        name: "Dog",
        art: `
  __      _
o'')}____//
 \`_/      )
 (_(_/-(_/
        `.trim(),
      }
    ]
  },
  {
    id: "computers",
    name: "Computers",
    thumbnail: `
 +----+
 |    |
 +----+
  ----
    `.trim(),
    items: [
      {
        id: "pc",
        name: "Desktop PC",
        art: `
   .----------------.
  | .--------------. |
  | |              | |
  | |   >_         | |
  | |              | |
  | '--------------' |
   '----------------'
       |      |
       '------'
        `.trim(),
      }
    ]
  },
  {
    id: "space",
    name: "Space",
    thumbnail: `
   *   .
 .   *
   .
    `.trim(),
    items: [
      {
        id: "rocket",
        name: "Rocket",
        art: `
    /\\
   /  \\
  /    \\
  |    |
  |    |
 /|    |\\
/_|____|_\\
   /\\/\\
        `.trim(),
      }
    ]
  },
  {
    id: "music",
    name: "Music",
    thumbnail: `
  :&:
   #
   #
  ( )
    `.trim(),
    items: [
      {
        id: "guitar",
        name: "Guitar",
        art: `
  :&:
   #
   #
  ( )
  / \\
 (===)
  ---
        `.trim(),
      }
    ]
  }
];
