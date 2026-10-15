# Conversing

## Purpose

Keep what people say about a subject in the order they said it, so that everyone reads the same conversation.

_Prevents:_ two people see a conversation's messages in different orders; an empty message clutters a conversation.

## Principle

During a job-offer negotiation, Hiro says "I was hoping for $120K" at 2:03 pm, and Manon replies "That's well above our budget" at 2:04 pm. Everyone reading the conversation sees Hiro's message and then Manon's, each with its sender and time. When Hiro tries to send a message with nothing but spaces in it, he is refused.

## Types

```types
external Subject
  What a conversation is about.

external Speaker
  Who sends a message.
```

## State

```state
a seq of Messages with
  a Subject
  a sender Speaker
  a body String
  a sentAt DateTime
```

## Actions

```actions
send(subject: Subject, sender: Speaker, body: String, now: DateTime) : returns (message: Message)
  where body is blank or longer than 2000 characters once trimmed
  then
    refuses INVALID_MESSAGE "A message must have 1 to 2,000 characters."
  where body is accepted
  then
    append a new message with subject, sender, the trimmed body, and sentAt now
    returns message
```

## Queries

```queries
_messages(subject: Subject) : many (message: Message, sender: Speaker, body: String, sentAt: DateTime)
  Returns every message about the subject, or no rows when there are none.
  Orders rows by when each message was sent, oldest first.
```
