# Proposing

## Purpose

Let the parties to a negotiation make formal offers to the whole group, so that an agreement exists only once every party other than the one who made an offer has accepted it, and exists at most once.

_Prevents:_ someone accepts their own offer; an offer counts as agreed before everyone has accepted it; someone accepts an offer that a newer one replaced; one negotiation ends up with two agreements.

## Principle

Ana, Ben, and Cal join a negotiation over the lease for an apartment they'll share. Ana proposes terms: Ben takes the big bedroom and pays $100 more each month. Ben accepts, but there is no agreement yet, because Cal hasn't accepted. Before Cal answers, Ana proposes new terms, which supersede the first proposal, so Ben's acceptance no longer counts. Cal rejects the new terms and proposes his own. Ana and Ben both accept them, and the three have agreed; from then on, every new proposal in this negotiation is refused. Nobody can accept their own proposal, and when Dee tries to join after the first proposal, she is refused.

## Types

```types
external Subject
  What the proposals are about, such as a negotiation.

external Party
  Who takes part in a negotiation, making proposals and answering them.

external Terms
  What a proposal offers. Proposing keeps it without reading it.

ProposalStatus is PENDING or ACCEPTED or REJECTED or RETRACTED or SUPERSEDED
  Whether a proposal awaits answers, was accepted by everyone or rejected by someone, was taken back by its proposer, or was replaced by a newer proposal.
```

## State

```state
a seq of Participants with
  a Subject
  a Party
  unique subject and party

a seq of Proposals with
  a Subject
  a proposer Party
  a Terms
  a status ProposalStatus
  a proposedAt DateTime

a set of Pending Proposals where status is PENDING with
  unique subject

a set of Accepted Proposals where status is ACCEPTED with
  unique subject

a seq of Acceptances with
  a Proposal
  a Party
  unique proposal and party

Rule: a proposal's proposer, and every party that accepted it, is a participant in its subject.
Rule: a proposal is ACCEPTED exactly when every participant in its subject other than its proposer has accepted it.
Rule: once a subject has an accepted proposal, it has no pending proposal.
```

## Actions

```actions
join(subject: Subject, party: Party) : returns ()
  where subject has a proposal
  then
    refuses PROPOSALS_STARTED "Nobody can join once proposals have been made."
  where subject has no proposal and party is already a participant in subject
  then
    refuses ALREADY_JOINED "That party is already part of this negotiation."
  where subject has no proposal and party is not a participant in subject
  then
    append party as a participant in subject
    returns

propose(subject: Subject, proposer: Party, terms: Terms, now: DateTime) : returns (proposal: Proposal)
  where proposer is not a participant in subject
  then
    refuses NOT_A_PARTICIPANT "Only a party to this negotiation can make a proposal."
  where proposer is a participant in subject and subject has no other participant
  then
    refuses NO_OTHER_PARTICIPANTS "There's nobody else to make a proposal to."
  where proposer is a participant in subject, subject has another participant, and subject has an accepted proposal
  then
    refuses ALREADY_AGREED "An agreement has already been reached."
  where proposer is a participant in subject, subject has another participant, and subject has no accepted proposal
  then
    set the status of the subject's pending proposal, if it has one, to SUPERSEDED
    append a new PENDING proposal with subject, proposer, terms, and proposedAt now
    returns proposal

accept(proposal: Proposal, party: Party) : returns (proposal: Proposal, subject: Subject, terms: Terms, status: ProposalStatus)
  where proposal is not in Pending Proposals, party is not a participant in its subject, or party is its proposer
  then
    refuses NOT_PENDING_FOR_YOU "There is no such proposal waiting for your answer."
  where proposal is in Pending Proposals, party is a participant in its subject other than its proposer, and party has already accepted proposal
  then
    refuses ALREADY_ACCEPTED "You've already accepted this proposal."
  where proposal is in Pending Proposals, party is a participant in its subject other than its proposer, party hasn't accepted proposal, and some other participant besides its proposer hasn't accepted it either
  then
    append an acceptance of proposal by party, leaving the proposal PENDING
    returns proposal, subject, terms, status
  where proposal is in Pending Proposals, party is a participant in its subject other than its proposer, party hasn't accepted proposal, and every other participant besides its proposer has accepted it
  then
    append an acceptance of proposal by party, and set the proposal's status to ACCEPTED
    returns proposal, subject, terms, status

reject(proposal: Proposal, party: Party) : returns (proposal: Proposal)
  where proposal is not in Pending Proposals, party is not a participant in its subject, or party is its proposer
  then
    refuses NOT_PENDING_FOR_YOU "There is no such proposal waiting for your answer."
  where proposal is in Pending Proposals and party is a participant in its subject other than its proposer
  then
    set the proposal's status to REJECTED
    returns proposal

retract(proposal: Proposal, proposer: Party) : returns (proposal: Proposal)
  where proposal is not in Pending Proposals, or proposer is not its proposer
  then
    refuses NOT_PENDING_FROM_YOU "There is no such proposal of yours waiting for an answer."
  where proposal is in Pending Proposals and proposer is its proposer
  then
    set the proposal's status to RETRACTED
    returns proposal
```

## Queries

```queries
_participants(subject: Subject) : many (party: Party)
  Returns every party that joined the subject, or no rows when nobody has.
  Orders rows by when each party joined.

_proposal(proposal: Proposal) : optional (subject: Subject, proposer: Party, terms: Terms, status: ProposalStatus, proposedAt: DateTime)
  Returns the proposal's subject, proposer, terms, status, and when it was made, or no row for an unknown proposal.

_proposals(subject: Subject) : many (proposal: Proposal, proposer: Party, terms: Terms, status: ProposalStatus, proposedAt: DateTime)
  Returns every proposal about the subject, or no rows when there are none.
  Orders rows by when each proposal was made, oldest first.

_acceptances(proposal: Proposal) : many (party: Party)
  Returns every party that has accepted the proposal so far, or no rows when nobody has.
  Orders rows by when each party accepted.

_agreement(subject: Subject) : optional (proposal: Proposal, proposer: Party, terms: Terms)
  Returns the subject's accepted proposal, or no row when nobody has accepted one.
```
