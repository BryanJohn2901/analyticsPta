import { parseBR, safeNumber, formatBRL, formatCompact, safeDivide } from "@/lib/format";

describe("parseBR", () => {
  it.each([
    ["1.234,56",    1234.56],
    ["R$ 1.234,56", 1234.56],
    ["1234,56",     1234.56],
    ["",            0],
    [null,          0],
    [undefined,     0],
    ["abc",         0],
    [NaN,           0],
    [Infinity,      0],
    [1234,          1234],
    [0,             0],
  ])("parseBR(%j) → %j", (input, expected) => {
    expect(parseBR(input)).toBe(expected);
  });
});

describe("safeNumber", () => {
  it("returns 0 for NaN", () => expect(safeNumber(NaN)).toBe(0));
  it("returns 0 for Infinity", () => expect(safeNumber(Infinity)).toBe(0));
  it("returns 0 for null", () => expect(safeNumber(null)).toBe(0));
  it("passes through valid numbers", () => expect(safeNumber(42.5)).toBe(42.5));
});

describe("agregação realista — regressão do bug do print", () => {
  it("soma impressões em formato de string sem concatenar", () => {
    const itens = [{ imp: "6.377" }, { imp: "398.457" }, { imp: "123.557" }];
    const total = itens.reduce((a, b) => a + parseBR(b.imp), 0);
    expect(total).toBe(528391); // 6377 + 398457 + 123557
    expect(Number.isNaN(total)).toBe(false);
  });

  it("não concatena strings numéricas ao acumular com +=", () => {
    const rows = [
      { impressions: "6.377" as unknown as number },
      { impressions: "398.457" as unknown as number },
    ];
    let acc = 0;
    rows.forEach((r) => { acc += safeNumber(r.impressions); });
    expect(acc).toBe(404834);
    expect(String(acc)).not.toContain("6.377398");
  });
});

describe("formatBRL", () => {
  it("formata número como moeda BR", () => {
    expect(formatBRL(1234.56)).toBe("R$ 1.234,56");
  });
  it("retorna R$ 0,00 para zero", () => {
    expect(formatBRL(0)).toBe("R$ 0,00");
  });
  it("não produz NaN", () => {
    expect(formatBRL(NaN)).not.toContain("NaN");
  });
});

describe("formatCompact", () => {
  it("mantém números pequenos sem compactar", () => {
    expect(formatCompact(999)).toBe("999");
  });
  it("compacta milhões", () => {
    const result = formatCompact(6_377_000);
    expect(result).toContain("mi");
    expect(result.length).toBeLessThan(10);
  });
});

describe("safeDivide", () => {
  it("retorna 0 quando denominador é zero", () => {
    expect(safeDivide(100, 0)).toBe(0);
  });
  it("divide normalmente", () => {
    expect(safeDivide(10, 4)).toBe(2.5);
  });
  it("aceita strings BR", () => {
    expect(safeDivide("1.000", "4")).toBe(250);
  });
});
