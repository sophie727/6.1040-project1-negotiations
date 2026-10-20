# Inviting

## Purpose

Let a person invite others into something with a link that can't be guessed, so that only people who were given the link can find their way in.

_Prevents:_ someone who guesses, or happens to learn, what an invitation leads to, such as a negotiation table's address, gets in without being invited.

## Principle

Nadia wants to practice The Job Offer with her friend Omar, so she invites him to her table and texts him the link, which carries the invitation's code. When Omar follows it, Inviting says which table the code is for and that Nadia sent it, so he can join her there. Leo sees the table's address on Nadia's screen, but no invitation has that address as its code, so it leads him nowhere. For a three-way negotiation, Nadia sends the same link to two friends, and it lets each of them in.

## Types

```types
external Subject
  What an invitation lets people into.

external Person
  Who sends an invitation.
```

## State

```state
a set of Invitations with
  a Subject
  an inviter Person
  a unique code String

Rule: an invitation's code is unguessable, and it is all someone needs to use the invitation.
```

## Actions

```actions
invite(subject: Subject, inviter: Person) : returns (invitation: Invitation, code: String)
  where true
  then
    add a new invitation with subject, inviter, and a new unguessable code
    returns invitation, code
```

## Queries

```queries
_invitation(code: String) : optional (invitation: Invitation, subject: Subject, inviter: Person)
  Returns the invitation with exactly this code, what it lets people into, and who sent it, or no row when no invitation has the code.

_invitations(subject: Subject) : many (invitation: Invitation, code: String, inviter: Person)
  Returns every invitation into the subject, with its code and who sent it, or no rows when there are none.
  Orders rows by when each invitation was made, oldest first.
```
