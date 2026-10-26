# Posting

## Purpose

Let someone put something up where everyone can find it, and take it down again later without undoing what people already did with it.

_Prevents:_ people find something before its owner posts it, or after they take it down; taking something down erases it, and with it what others already did with it.

## Principle

Sophie finishes writing The Lease and posts it, so it is among the posted items, where anyone can find it. She also posted Test Lease, to see how the page works, and now archives it. It is still posted, so whatever people already did with it still refers to something posted, but it is archived, so nobody new picks it. If she wants it back, she unarchives it. She can't post The Lease a second time, and she can't archive something she never posted.

## Types

```types
external Item
  What is posted.
```

## State

```state
a set of Posts with
  a unique Item
  an archived Flag
```

## Actions

```actions
post(item: Item) : returns ()
  where item has a post
  then
    refuses ALREADY_POSTED "This is already posted."
  where item has no post
  then
    add a new post with item, not archived
    returns

archive(item: Item) : returns ()
  where item has no post
  then
    refuses NOT_POSTED "Only something posted can be archived."
  where item's post is archived
  then
    refuses ALREADY_ARCHIVED "This is already archived."
  where item's post is not archived
  then
    set item's post to archived
    returns

unarchive(item: Item) : returns ()
  where item has no post, or its post is not archived
  then
    refuses NOT_ARCHIVED "This isn't archived."
  where item's post is archived
  then
    set item's post to not archived
    returns
```

## Queries

```queries
_posts() : many (item: Item, archived: Flag)
  Returns every posted item and whether it is archived, or no rows when nothing is posted.
  Orders rows by when each item was posted, oldest first.

_post(item: Item) : one (posted: Flag, archived: Flag)
  Returns whether the item is posted, and whether it is archived; an item never posted is neither.
```
