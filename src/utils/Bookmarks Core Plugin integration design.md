Integration with Bookmarks core plugin:
- support two approaches _at the same time_:
  - (A) structured bookmarks inside a dedicated bookmarks group, and
  - (B) a flat list of bookmarks inside the dedicated bookmarks group

For (A):
- preferred
- a folder is represented by a group in bookmarks
- a file is represented by a file-with-block
  - this also applied to non-md files, like jpg and others
- guarantees _'hiding'_ the bookmarks-for-sorting from regular bookmarks usage scenarios
  - bookmark entries for sorting are encapsulated in the dedicated group
  - they don't interfere with bookmarking of files and folders via standard bookmarking
- only exact location of file bookmark / group matches for sorting order in file explorer
- the contextual bookmark menus always work in (A) mode
  - the contextual menus create / modify the bookmarks structure on-the-fly

For (B):
- discouraged, yet supported (exception for some edge cases)
- typically a result of manual bookmarks management
- for small number of items seems reasonable
- for flat vaults it could look same as for (A)
- groups don't have a 'path' attribute, their path is determined by their location
- bookmarked folders represent folders if inside the bookmarks group for sorting
  - yet in this way they interfere with regular bookmarks scenario
- file bookmarks work correctly in non-interfering way thanks to the _'artificial block reference'_
- file bookmarks not having the _'artificial block ref'_ work as well
  - if they are in the designated bookmarks group
  - if there isn't a duplicate, which has the _'artificial block ref'_
  - yet in this way they interfere with regular bookmarks scenario

-[ ] TODO: review again the 'item moved' and 'item deleted' scenarios (they look ok, check if they don't delete/move too much)
  - [x] fundamental question 1: should 'move' create a bookmark entry/structure if it is not covered by bookmarks?
    - Answer: the moved item is removed from bookmarks. If it is a group with descendants not transparent for sorting,
              it is renamed to become transparent for sorting.
              By design, the order of items is property of the parent folder (the container) and not the items  
  - [x] fundamental question 2: should 'move' create a bookmark entry if moved item was not bookmarked, yet is moved to a folder covered by bookmarks?
    - Answer: same as for previous point.
  - [x] review from (A) and (B) perspective
    - Answer: scenario (A) is fully handled by 'item moved' and 'item deleted'.
              scenario (B) is partially handled for 'item moved'. Details to be read from code (too complex to cover here)
  - [x] consider deletion of item outside of bookmarks sorting container group
    Answer: bookmark items outside of bookmarks sorting container are not manipulated by custom-sort plugin
            to not interfere with standard Bookmarks scenarios
  - [x] consider moving an item outside of bookmarks group
    - Answer: question not relevant. Items are moved in file explorer and bookmarks only reflect that, if needed.
            Hence there is no concept of 'moving an item outside of bookmarks group' - bookmarks group only exists in bookmarks 
  - [x] edge case: bookmarked item is a group, the deleted/moved is a file, not a folder --> what to do?
    - Answer: for moved files, only file bookmarks are scanned (and handles), for moved folders, only groups are scanned (and handled).
  - [x] delete all instances at any level of bookmarks structure in 'delete' handler
    - Answer: only instances of (A) or (B) are deleted. Items outside of bookmarks container for sorting or
              in invalid locations in bookmarks hierarchy are ignored 



