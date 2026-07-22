import { parseAgentWizardResponse } from "./AgentWizardHelpers";

describe("parseAgentWizardResponse", () => {
  it("parses plain and fenced JSON", () => {
    const json = '{"name":"Reviewer","temperature":0.3,"prompt":"Review carefully"}';
    expect(parseAgentWizardResponse(json)).toEqual({
      name: "Reviewer",
      temperature: 0.3,
      prompt: "Review carefully",
    });
    expect(parseAgentWizardResponse(`\`\`\`json\n${json}\n\`\`\``)).not.toBeNull();
  });

  it("extracts a JSON object from surrounding text", () => {
    expect(parseAgentWizardResponse('Here: {"name":"Writer","temperature":1,"prompt":"Write"} done')).toMatchObject({
      name: "Writer",
    });
  });

  it("rejects malformed and out-of-range configurations", () => {
    expect(parseAgentWizardResponse("not json")).toBeNull();
    expect(parseAgentWizardResponse('{"name":"X","temperature":3,"prompt":"P"}')).toBeNull();
    expect(parseAgentWizardResponse('{"name":"","temperature":1,"prompt":"P"}')).toBeNull();
  });
});
