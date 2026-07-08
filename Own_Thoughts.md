# Thoughts After Developing the AI Meeting Note Summarizer

## A. Overall Implementation Approach

The whole process is done under a few steps:
1. Get to know what resources, tools I have in hand. -> **Agora Documentation, MCP, Skill, CLI, App Builder, Gemini CLI** 
2. Briefly go thru all the resources related to Agora to get to know their capables.
3. Generate a implementation plan.
4. Create relevant skills for Gemini CLI to modify code using the Agora tools and standards.
5. Plan Execution.

## B. Which AI tools you used

The coding part was `Gemini CLI` and the Meeting Note Summarizer was `Gemini 2.5 Flash`

## C. A few representative prompts you used

@Gemini_Skill.md - the skill I specifically created to develop Agora apps using Agora tools.

## D. Where AI helped you

I use AI on these moment:
- Detailed research on Agora Documentation
- UI design
- Bug / API route backtracking
- Coding

## E. Where AI gave incorrect or incomplete suggestions, and how you corrected them

Most of the scenario I will choose to open a new session, fine tune the prompt then only run the task again.

## F. One major technical issue you encountered, and how you investigated and resolved it

In the initial phase, the app ran into the STT error where it says user unauthorized. Ask Gemini CLI to search it on Agora Documentation, MCP, etc but error remain the same.

In the end, I manually go thru the documention related to authentication. Fix it by creating and added the Customer ID and Secret into the config and error is solved. 