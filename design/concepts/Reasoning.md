# Reasoning

## Purpose

Let people ask a reasoner a question that takes time to answer, and read the answer as the reasoner writes it.

_Prevents:_ someone abandons a question without saying why; someone reads an answer but can't see the question or what it was about; two reasoners answer the same question at once; someone deletes what they asked about, and the answers about it stay behind.

## Principle

Maya asks for a short description of her photo `beach.jpg`. A model takes the question and writes an answer a few words at a time, and Maya reads it as it grows: "Two people", " on a beach", " at sunset". The model concludes, and from then on Reasoning returns the finished answer with the question, the photo it was about, and the model that wrote it. When a second model tries to take the same question or add to the answer, it is refused. Later, Maya asks about another file while the model is unreachable; the program that runs the model abandons the question with the reason "The model could not be reached.", and Maya reads that reason instead of an answer. When she deletes `beach.jpg` for good, every question about it is forgotten, and Reasoning returns none of them.

## Types

```types
external Subject
  What a question is about.

external Reasoner
  Whoever answers a question: a language model, a program, or a person.

Stage is WAITING or FORMING or CONCLUDED or ABANDONED
  How far a prompt has got: no reasoner has taken it, a reasoner is writing its answer, the reasoner has concluded it, or someone has abandoned it.
```

## State

```state
a seq of Prompts with
  a Subject
  an ask String
  an answer String

a set of Taken Prompts with
  a Reasoner

a set of Concluded Prompts

a set of Abandoned Prompts with
  a reason String

Rule: no prompt is in both Concluded Prompts and Abandoned Prompts, and a prompt leaves either only when it is forgotten.
```

## Actions

```actions
prompt(subject: Subject, ask: String) : returns (prompt: Prompt)
  where ask is blank
  then
    refuses NOTHING_ASKED "The question is blank."
  where ask is not blank
  then
    append a new prompt with subject, ask, and an empty answer
    returns prompt

take(prompt: Prompt, reasoner: Reasoner) : returns (prompt: Prompt)
  where prompt is unknown
  then
    refuses UNKNOWN_PROMPT "There is no such prompt."
  where prompt is in Concluded Prompts or Abandoned Prompts
  then
    refuses CLOSED "This prompt is already concluded or abandoned."
  where prompt is in Taken Prompts
  then
    refuses ALREADY_TAKEN "This prompt has already been taken."
  where prompt is not in Taken Prompts
  then
    add prompt to Taken Prompts with reasoner
    returns prompt

extend(prompt: Prompt, reasoner: Reasoner, text: String) : returns ()
  where prompt is unknown
  then
    refuses UNKNOWN_PROMPT "There is no such prompt."
  where prompt is in Concluded Prompts or Abandoned Prompts
  then
    refuses CLOSED "This prompt is already concluded or abandoned."
  where prompt is not in Taken Prompts
  then
    refuses NOT_TAKEN "A reasoner has to take this prompt before answering it."
  where another reasoner took prompt
  then
    refuses NOT_YOURS "Only the reasoner that took this prompt can answer it."
  where reasoner took prompt
  then
    append text to the prompt's answer
    returns

conclude(prompt: Prompt, reasoner: Reasoner) : returns (prompt: Prompt, subject: Subject, ask: String)
  where prompt is unknown
  then
    refuses UNKNOWN_PROMPT "There is no such prompt."
  where prompt is in Concluded Prompts or Abandoned Prompts
  then
    refuses CLOSED "This prompt is already concluded or abandoned."
  where prompt is not in Taken Prompts
  then
    refuses NOT_TAKEN "A reasoner has to take this prompt before answering it."
  where another reasoner took prompt
  then
    refuses NOT_YOURS "Only the reasoner that took this prompt can answer it."
  where the prompt's answer is blank
  then
    refuses EMPTY_ANSWER "The answer is still empty; abandon the prompt instead."
  where reasoner took prompt and its answer is not blank
  then
    add prompt to Concluded Prompts
    returns prompt, subject, ask

abandon(prompt: Prompt, reason: String) : returns (prompt: Prompt)
  where reason is blank
  then
    refuses NO_REASON "Say why you are abandoning the prompt."
  where prompt is unknown
  then
    refuses UNKNOWN_PROMPT "There is no such prompt."
  where prompt is in Concluded Prompts or Abandoned Prompts
  then
    refuses CLOSED "This prompt is already concluded or abandoned."
  where reason is not blank
  then
    add prompt to Abandoned Prompts with reason
    returns prompt

forget(subject: Subject) : returns (subject: Subject)
  where true
  then
    remove every prompt about subject, whatever its stage
    returns subject
```

## Queries

```queries
_waiting() : many (prompt: Prompt, subject: Subject, ask: String)
  Returns the prompts no reasoner has taken and nobody has abandoned, oldest first, or no rows when there are none.

_about(subject: Subject) : many (prompt: Prompt, ask: String, answer: String, stage: Stage)
  Returns every prompt about the subject, oldest first, with its answer so far and its stage, or no rows when there are none.

_taken(reasoner: Reasoner) : many (prompt: Prompt, subject: Subject)
  Returns the prompts the reasoner has taken and not yet concluded or abandoned, with what each is about, oldest first, or no rows when there are none.

_reasoner(prompt: Prompt) : optional (reasoner: Reasoner)
  Returns the reasoner that took the prompt, or no row when nobody has taken it.

_reason(prompt: Prompt) : optional (reason: String)
  Returns the reason given when the prompt was abandoned, or no row when it wasn't.

_lines(prompt: Prompt) : many (line: String, position: Number)
  Returns the nonblank lines of a concluded prompt's answer, trimmed, in order, each with its position counting from 0, or no rows when the prompt isn't concluded.
```
