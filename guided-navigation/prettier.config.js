const gndKeyOrder = [
  "role",
  "id",
  "description",
  "textref",
  "imgref",
  "audioref",
  "videoref",
  "text",
  "language",
  "plain",
  "ssml",
  "children",
];

export default {
  overrides: [
    {
      files: "fixtures/**/gnd.json",
      options: {
        plugins: ["prettier-plugin-sort-json"],
        jsonRecursiveSort: true,
        jsonSortOrder: JSON.stringify(Object.fromEntries(gndKeyOrder.map((key) => [key, null]))),
      },
    },
  ],
};
