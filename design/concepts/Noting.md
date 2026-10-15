# Noting

## Purpose

Let each person keep their own notes about something and come back to them later.

_Prevents:_ someone ends up with several versions of their notes about the same thing.

## Principle

During a job-offer negotiation, Nadia writes "Manon keeps mentioning the start date" in her notes. A minute later she writes "Manon keeps mentioning the start date. Possibly her priority?", which replaces the first version, so when she opens her notes for this negotiation again, she reads the second one. Her notes for her next negotiation start out empty, and anyone else's notes about this negotiation are separate from hers.

## Types

```types
external Author
  The person who writes the notes.

external Subject
  What the notes are about.
```

## State

```state
a set of Notes with
  an Author
  a Subject
  a body String
  unique author and subject
```

## Actions

```actions
write(author: Author, subject: Subject, body: String) : returns (note: Note)
  where body is longer than 20000 characters
  then
    refuses TOO_LONG "Notes can have at most 20,000 characters."
  where body has at most 20000 characters and author has a note about subject
  then
    replace that note's body with body
    returns note
  where body has at most 20000 characters and author has no note about subject
  then
    add a new note with author, subject, and body
    returns note
```

## Queries

```queries
_note(author: Author, subject: Subject) : optional (body: String)
  Returns the author's notes about the subject, or no row when they haven't written any.
```
