describe("The database", () => {
  beforeEach(() => {
    console.log("Before...");
  });

  afterEach(() => {
    console.log("After...");
  });

  it("spins up and responds to an SQL command", () => {
    const records = [];
    expect(records.length).toBe(1);
  });
});
