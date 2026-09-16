const GREETING_REPLY = `Hi! There's so much I can help you with today. Here are a few ideas:

- Answer questions and explain concepts
- Brainstorm ideas for a project
- Help you write, review, or debug code

What would you like to try first?

## Tip

The more specific you are, the better I can help. Try stating your goal clearly and I'll give you a focused answer.`

const HOW_TO_REPLY = `Great question! Here's how to set up a new project from scratch.

## Prerequisites

- Node.js 20 or newer installed
- npm (bundled with Node.js)

## Steps

1. Create a new folder and open it in your terminal.
2. Run \`npm init -y\` to generate a package.json.
3. Install your dependencies with \`npm install <package>\`.
4. Add a start script to package.json and run it.

## Example

\`\`\`sh
npm create vite@latest my-app -- --template react
cd my-app
npm install
npm run dev
\`\`\`

## Tip

Use a lockfile and commit it so every install is reproducible.

## Note

Pin your dependency versions so nothing breaks unexpectedly.

## Summary

You now have a working project: a config file, installed dependencies, and a runnable start command.`

const CELEBRATION_REPLY = `You did it! That's a solid outcome and definitely worth celebrating.

## Summary

- Goal achieved
- Everything is working as expected
- Nothing left open

## Tip

Save what worked here so you can reuse the setup next time.

## Note

Keep an eye on the logs in case something subtle slips through later.`

const CLARIFYING_REPLY = `Could you tell me a little more about what you're trying to achieve? Knowing your exact goal will help me point you in the right direction.

## Summary

- I need more detail about the end goal
- Share the expected outcome you want
- I'll follow up with a precise plan and steps`

export function getMockReply(text) {
  const value = String(text || '').toLowerCase()

  if (/(^|\s)(hi|hello|hey|good (morning|afternoon|evening))\b|greetings/.test(value)) {
    return GREETING_REPLY
  }
  if (/\b(congrat|success|celebrat|well done|great work|you did it)\b|amazing|excellent/.test(value)) {
    return CELEBRATION_REPLY
  }
  if (/^(help|hmm|idk|not sure|what should i|i don'?t know|suggest something|anything)/.test(value)) {
    return CLARIFYING_REPLY
  }
  return HOW_TO_REPLY
}