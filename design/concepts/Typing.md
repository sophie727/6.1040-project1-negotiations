# Typing

## Purpose

Let the people in a conversation see who is writing to them, so they know a reply is coming.

_Prevents:_ a sign that someone is typing stays up after they stopped, sent their message, or closed the page.

## Principle

Nadia and Omar are negotiating The Job Offer. While Omar writes a reply, his page keeps saying he is typing, a few seconds at a time, and Nadia sees "Manon is typing…". When he sends the message, he stops typing, and the sign goes away at once. When he stops writing without sending, such as when he closes the page, his last signal runs out a few seconds later.

## Types

```types
external Subject
  The conversation someone is typing in.

external Typist
  Who is typing.
```

## State

```state
a set of Signals with
  a Subject
  a Typist
  an until DateTime
  unique subject and typist
```

## Actions

```actions
type(subject: Subject, typist: Typist, now: DateTime) : returns ()
  where true
  then
    set the typist's signal about subject to last until 6 seconds after now, adding the signal if there is none
    returns

stop(subject: Subject, typist: Typist) : returns ()
  where true
  then
    remove the typist's signal about subject, if there is one
    returns
```

## Queries

```queries
_typing(subject: Subject, now: DateTime) : many (typist: Typist)
  Returns everyone whose signal about the subject lasts past now, or no rows when nobody is typing.
  Orders rows by typist.
```
