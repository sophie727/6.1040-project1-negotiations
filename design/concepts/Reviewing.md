# Reviewing

## Purpose

Let people who dealt with each other say how it went, once each, so that everyone's reputation reflects what the people they've dealt with think of them.

_Prevents:_ someone reviews themselves; someone reviews the same person twice about one dealing, stacking their reputation; a review outside the scale.

## Principle

After their negotiation of The Job Offer, Nadia gives Omar 5 stars for how it was to deal with him, and Omar gives Nadia 4. When Nadia tries to review Omar again about the same negotiation, she is refused, but after their next negotiation, she gives him 3. Omar's standing is the average of the stars he has received: 4 stars, from 2 reviews. Nadia can't review herself.

## Types

```types
external Subject
  What the people dealt with each other about, such as a negotiation.

external Person
  Who reviews, and who is reviewed.
```

## State

```state
a set of Reviews with
  a Subject
  a reviewer Person
  a reviewee Person
  a stars Number
  unique subject and reviewer and reviewee

Rule: a review's stars are a whole number from 1 to 5, and its reviewer isn't its reviewee.
```

## Actions

```actions
review(subject: Subject, reviewer: Person, reviewee: Person, stars: Number) : returns (review: Review)
  where reviewer is reviewee
  then
    refuses SELF_REVIEW "You can't review yourself."
  where reviewer isn't reviewee, and stars is not a whole number from 1 to 5
  then
    refuses INVALID_STARS "A review gives 1 to 5 stars."
  where reviewer isn't reviewee, stars is accepted, and reviewer has already reviewed reviewee about subject
  then
    refuses ALREADY_REVIEWED "You've already reviewed them for this."
  where reviewer isn't reviewee, stars is accepted, and reviewer hasn't reviewed reviewee about subject
  then
    add a new review with subject, reviewer, reviewee, and stars
    returns review
```

## Queries

```queries
_review(subject: Subject, reviewer: Person, reviewee: Person) : optional (stars: Number)
  Returns the stars the reviewer gave the reviewee about the subject, or no row when they haven't reviewed them about it.

_standing(reviewee: Person) : one (stars?: Number, reviews: Number)
  Returns the average of the stars the person has received, and how many reviews they have received, or no stars and 0 reviews when they have none.
```
