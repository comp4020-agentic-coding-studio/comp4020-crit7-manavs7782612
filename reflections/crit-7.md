# Crit 7 reflection

**What was the breakthrough that moved the work forward?**

Naming the five pain points as specific database fields, not adjectives. It
was easy to say "eligibility should be clear" and much harder to know when
that was actually done — but once eligibility criteria and required
documents were columns on `permit_types` that every page had to read from the
same place, "is this fixed?" became a question I could answer by grepping the
served HTML, and later by writing a test for it. The vague redesign brief
turned into a checklist the moment it became a schema.

**What did this work change about who I want to be as a software developer?**

I noticed how much of "good UX" I'd been treating as a design opinion that
was actually a data-modelling decision in disguise — the real ePermit
portal's confusion isn't really a styling problem, it's that audience,
eligibility and document requirements were never first-class facts anywhere
in its system, so no page could consistently surface them. That's changed how
I want to read a bad interface from now on: before redesigning what's on
screen, ask what fact is missing from the data model that would make the
screen impossible to get wrong. It also made me more comfortable shipping a
deliberately thin slice — cutting the starter's live-broadcast feature
outright, rather than carrying it forward unused, because a feature with no
job in this flow was itself a small performance cost.
