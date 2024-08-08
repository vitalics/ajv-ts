/// NOTE: experimental module
import Benchmark from "benchmark";
import s from "../src";

const suite = new Benchmark.Suite();

const cases = [
  { name: "string valid input", caller: s.string(), input: "123" },
  {
    name: "string valid input with error message",
    caller: s.string().error("qwe"),
    input: "123",
  },
  { name: "string invalid input", caller: s.string(), input: 123 },
  {
    name: "string invalid input with error message",
    caller: s.string().error("qwe"),
    input: 123,
  },
];

for (const testCase of cases) {
  suite.add(`safeParse ${testCase.name}`, () => {
    const schem = testCase.caller;
    schem.safeParse(testCase.input);
  });

  suite.add(`validate ${testCase.name}`, () => {
    const schem = testCase.caller;
    schem.validate(testCase.input);
  });
  suite.add(`parse ${testCase.name}`, () => {
    const schem = testCase.caller;
    try {
      schem.parse(testCase.input);
    } finally {
    }
  });
}

suite
  .on("cycle", (e: any) => console.log(String(e.target)))
  .on("complete", function () {
    console.log("The fastest:" + '"' + this.filter("fastest").map("name")) +
      '"';
  })
  .run({ async: true });
