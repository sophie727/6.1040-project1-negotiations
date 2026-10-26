import mandy from "./briefs/mandy.md" with { type: "text" };
import presley from "./briefs/presley.md" with { type: "text" };
import sally from "./briefs/sally.md" with { type: "text" };
import type { ScenarioDefinition } from "./theJobOffer.ts";

/** The Launch Room, from design/notes/example_cases/inter-team-dynamics.md: three heads of department agree on a launch. */
export const theLaunchRoom: ScenarioDefinition = {
  name: "The Launch Room",
  timeLimit: 45,
  issues: [
    {
      name: "Launch date",
      kind: "CONTINUOUS",
      unit: "days after March 1",
      // April 15 is 45 days after March 1, May 1 is 61, and June 1 is 92.
      options: [
        { name: "March 1", universalValue: 0 },
        { name: "April 15", universalValue: 45 },
        { name: "May 1", universalValue: 61 },
        { name: "June 1", universalValue: 92 },
      ],
    },
    {
      name: "Halvorsen integration",
      kind: "DISCRETE",
      options: [{ name: "Not planned" }, { name: "Within 60 days of launch" }, { name: "Ready at launch" }],
    },
    {
      name: "List price",
      kind: "CONTINUOUS",
      unit: "dollars",
      options: [
        { name: "$30", universalValue: 30 },
        { name: "$60", universalValue: 60 },
      ],
    },
    {
      name: "Halvorsen's discount",
      kind: "CONTINUOUS",
      unit: "percent",
      options: [
        { name: "0%", universalValue: 0 },
        { name: "40%", universalValue: 40 },
      ],
    },
    {
      name: "Early access",
      kind: "DISCRETE",
      options: [{ name: "Exclusive for Halvorsen" }, { name: "Open beta" }, { name: "None before launch" }],
    },
    {
      name: "Design authority",
      kind: "DISCRETE",
      options: [{ name: "Product decides alone" }, { name: "Shared sign-off" }, { name: "Anyone can veto" }],
    },
  ],
  roles: [
    {
      name: "Mandy",
      summary: "Head of marketing at Solidum, agreeing with the heads of product and sales on how to launch Solidum Atlas, a new AI analytics assistant, before the CEO decides for them.",
      batna: 750,
      brief: mandy,
      points: {
        "Launch date": { "March 1": 100, "April 15": 500, "May 1": 0, "June 1": 0 },
        "Halvorsen integration": { "Not planned": 0, "Within 60 days of launch": 0, "Ready at launch": 0 },
        "List price": { $30: 0, $60: 400 },
        "Halvorsen's discount": { "0%": 100, "40%": 0 },
        "Early access": { "Exclusive for Halvorsen": 100, "Open beta": 50, "None before launch": 300 },
        "Design authority": { "Product decides alone": 0, "Shared sign-off": 150, "Anyone can veto": 200 },
      },
    },
    {
      name: "Presley",
      summary: "Head of product at Solidum, agreeing with the heads of marketing and sales on how to launch Solidum Atlas, a new AI analytics assistant, before the CEO decides for them.",
      batna: 800,
      brief: presley,
      points: {
        "Launch date": { "March 1": 0, "April 15": 150, "May 1": 235, "June 1": 400 },
        "Halvorsen integration": { "Not planned": 400, "Within 60 days of launch": 250, "Ready at launch": 0 },
        "List price": { $30: 0, $60: 0 },
        "Halvorsen's discount": { "0%": 0, "40%": 0 },
        "Early access": { "Exclusive for Halvorsen": 150, "Open beta": 250, "None before launch": 0 },
        "Design authority": { "Product decides alone": 500, "Shared sign-off": 200, "Anyone can veto": 0 },
      },
    },
    {
      name: "Sally",
      summary: "Head of sales at Solidum, agreeing with the heads of marketing and product on how to launch Solidum Atlas, a new AI analytics assistant, before the CEO decides for them.",
      batna: 850,
      brief: sally,
      points: {
        "Launch date": { "March 1": 300, "April 15": 200, "May 1": 130, "June 1": 0 },
        "Halvorsen integration": { "Not planned": 0, "Within 60 days of launch": 250, "Ready at launch": 450 },
        "List price": { $30: 200, $60: 0 },
        "Halvorsen's discount": { "0%": 0, "40%": 350 },
        "Early access": { "Exclusive for Halvorsen": 300, "Open beta": 100, "None before launch": 0 },
        "Design authority": { "Product decides alone": 0, "Shared sign-off": 100, "Anyone can veto": 150 },
      },
    },
  ],
};
