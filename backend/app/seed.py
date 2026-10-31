"""Fictional sample archive used for the demo walkthrough.

Every entry here is invented. The Mehta family does not exist. The archive is
seeded only on a first run (a marker row in app_meta prevents re-seeding), and each
row is flagged `is_demo` so it can be cleared from the UI in one action.

Note what is deliberately *absent*: nothing in this archive says anything about
Kamala Mehta's first paid work, her schooling, or her siblings' names. That gap is
what makes the "unsupported question" demo honest rather than staged.
"""

from __future__ import annotations

from typing import Any

DEMO_MARKER = "demo_seeded_v1"

MEMORIES: list[dict[str, Any]] = [
    {
        "title": "Kamala's Kheer",
        "memory_date": "1974-11-03",
        "category": "Recipe",
        "people": ["Kamala Mehta"],
        "tags": ["diwali", "dessert", "festival", "kitchen", "grandma"],
        "content": (
            "Kamala made kheer in a heavy brass pot on the lowest flame the stove would hold. "
            "It was the only recipe she never wrote down, and the one she was asked for most. "
            "Cooking was the one thing she never hurried, and she cooked this the way she cooked "
            "everything else, as though the pot were listening. "
            "She used short-grain rice, soaked for an hour, and full-fat milk that she reduced by "
            "half, stirring with a wooden spoon so the bottom would not catch. The cardamom she "
            "crushed herself with the back of a spoon, never ground. Saffron went in last, bloomed "
            "first in two spoons of warm milk, and the sugar only in the final ten minutes. "
            "When anyone asked how much rice, she said the rice would tell you. She made it the "
            "night before Diwali and let it cool on the terrace window with a cloth over the top, "
            "and in the morning it was thick enough that a spoon would stand up in it. "
            "This was the dish everyone asked for first, and the one she was most stubborn about. "
            "Aditi once tried to make it with basmati and was told, kindly, that this was not kheer."
        ),
    },
    {
        "title": "The House on Gokhale Road",
        "memory_date": "1962-06-18",
        "category": "Home",
        "people": ["Kamala Mehta", "Devendra Mehta"],
        "tags": ["nagpur", "hometown", "house", "neem tree", "grandma"],
        "content": (
            "The family's first proper house was three rooms off Gokhale Road, Nagpur, and the "
            "family called it the old house long before it was old. The front door was painted a "
            "deep blue that Devendra mixed himself and never repainted. There was a courtyard with "
            "a neem tree, a stone ledge where the milk was set to cool, and a step that everyone "
            "sat on in the evening because it held the last of the sun. Nagpur was the family's "
            "hometown in the way that matters: every story about who they were started there. "
            "In the 1976 monsoon the roof over the back room began to leak, and the letter that "
            "survives from that year is mostly about the roof. The house was sold in 1994, and the "
            "blue door went with it."
        ),
    },
    {
        "title": "Diwali on the Terrace",
        "memory_date": "1991-11-07",
        "category": "Tradition",
        "people": ["Kamala Mehta", "Sumitra", "Ravi Mehta"],
        "tags": ["diwali", "festival", "terrace", "ladoos", "grandma"],
        "content": (
            "Diwali celebrations at the old house happened on the terrace, never indoors. Devendra "
            "set out forty small clay diyas in a single line along the parapet, and Kamala insisted "
            "the line be straight. Sumitra made the ladoos, besan and ghee and a great deal of "
            "patience, and kept them in a steel tin that she guarded from the children until the "
            "evening puja was finished. The rangoli at the threshold was rice flour and rose petals, "
            "drawn by whoever was smallest that year. After the lamps were lit everyone stayed up on "
            "the terrace, because the house was too loud and the sky was better. Kamala wore the "
            "marigold sari on that night and no other."
        ),
    },
    {
        "title": "The Summer of 1998",
        "memory_date": "1998-05-24",
        "category": "Journey",
        "people": ["Ravi Mehta", "Aditi Mehta"],
        "tags": ["nagpur", "summer", "train", "mangoes"],
        "content": (
            "In the summer of 1998 Ravi and Aditi took the overnight train from Pune to Nagpur, "
            "third class, with a cardboard box of mangoes wedged under the seat. The fan in the "
            "compartment turned but did not move air. They arrived at six in the morning and found "
            "Kamala already awake, already making tea, and entirely unsurprised. That summer is the "
            "one everyone means when they say the long summer: the courtyard at four in the "
            "afternoon, the neem tree, the radio, and nothing that had to be done. Aditi learned to "
            "make puran poli that summer and has never made it as well since."
        ),
    },
    {
        "title": "Puran Poli on Sundays",
        "memory_date": "1980-02-10",
        "category": "Recipe",
        "people": ["Kamala Mehta", "Sumitra"],
        "tags": ["recipe", "sunday", "jaggery", "festival", "grandma"],
        "content": (
            "Puran poli was a Sunday thing, made in batches large enough to be sent to three "
            "houses. The filling was chana dal cooked soft and mashed with jaggery and a scrape of "
            "nutmeg, cooked down until it held together and stopped looking wet, which Kamala said "
            "was the whole trick. Sumitra rolled hers thinner than anyone and was quietly proud of "
            "it. They were cooked on a dry iron griddle, one at a time, and brushed with ghee only "
            "after they came off the flame. The first one was never eaten by the person who made it; "
            "that was not a rule anyone had written down."
        ),
    },
    {
        "title": "A Letter from Jaipur, 1976",
        "memory_date": "1976-08-12",
        "category": "Letter",
        "people": ["Kamala Mehta", "Devendra Mehta"],
        "tags": ["letter", "monsoon", "roof", "jaipur", "papa"],
        "content": (
            "A handwritten letter from Devendra, posted from Jaipur in August 1976 during the "
            "monsoon. He wrote that he was well, that the rain had come late and then all at once, "
            "and that he had been thinking about the back room of the old house. The roof needed a "
            "new sheet, not a patch, and he had asked his brother to arrange it before the Diwali "
            "work began. He asked after Kamala's mother, mentioned that Sumitra should not be "
            "allowed to carry the tin of ladoos up the stairs, and closed by saying he would be home "
            "before the month was out. The paper is thin and the ink has faded to brown."
        ),
    },
    {
        "title": "Ravi's First Bicycle",
        "memory_date": "1985-04-02",
        "category": "Milestone",
        "people": ["Ravi Mehta", "Devendra Mehta"],
        "tags": ["bicycle", "childhood", "hercules", "mill lane"],
        "content": (
            "A blue Hercules, second-hand, bought from a cycle shop near the mill lane for a sum "
            "Devendra would not repeat in front of the neighbours. Ravi learned in the mill lane "
            "because it was flat and because very little traffic came through it before seven. He "
            "fell four times on the first day and did not fall again. The bicycle was too large for "
            "him by a hand's width, and he rode it for six years anyway. Devendra held the back of "
            "the seat and then let go without saying so, which Ravi still describes as the fairest "
            "thing anyone ever did for him."
        ),
    },
    {
        "title": "The Monsoon Photographs",
        "memory_date": "1993-07-19",
        "category": "Photograph",
        "people": ["Aditi Mehta", "Kamala Mehta"],
        "tags": ["photographs", "monsoon", "green sari", "rain"],
        "content": (
            "A cardboard envelope of photographs, taken in the monsoon of 1993, several of them "
            "water-stained at one corner. In three of them Kamala stands on the front step of the "
            "old house in a green sari, one hand on the blue door frame, squinting slightly because "
            "the light behind her was very bright. In another, the courtyard is flooded to the "
            "ankles and the neem tree is bent sideways. Nobody remembers who took them. Aditi kept "
            "the envelope in a suitcase for twenty years and then had the best four scanned and "
            "printed, and those are the ones framed in the hallway."
        ),
    },
    {
        "title": "Nani's Wedding Sari",
        "memory_date": "1958-02-14",
        "category": "Object",
        "people": ["Kamala Mehta"],
        "tags": ["sari", "wedding", "heirloom", "banarasi", "nani", "grandma"],
        "content": (
            "A Banarasi silk sari in deep marigold with a fine gold zari border, worn once for the "
            "wedding in February 1958 and then kept folded in muslin with dried neem leaves between "
            "the layers. It was never worn again; Kamala said it was too heavy to be practical and "
            "too beautiful to be cut up. Twice a year she aired it on the terrace, and it was the "
            "only object in the house she would not let anyone else handle. The sari came to Aditi "
            "in 1994, still in the same muslin, and is now kept flat in a drawer rather than hung."
        ),
    },
    {
        "title": "The Radio in the Kitchen",
        "memory_date": "1979-01-15",
        "category": "Story",
        "people": ["Kamala Mehta", "Devendra Mehta"],
        "tags": ["radio", "kitchen", "music", "news", "grandma"],
        "content": (
            "A Murphy radio on the kitchen shelf, tuned every evening to the eight o'clock news and "
            "afterwards to film songs. Devendra claimed the news, Kamala claimed everything after it. "
            "She hummed along without ever admitting she knew the words, and if a song she liked "
            "came on she would stop what she was doing and stand with her hands still until it "
            "finished. When the radio finally failed in 1988 nobody threw it out. It sat on the same "
            "shelf for another decade, silent, because the kitchen did not look right without it."
        ),
    },
    {
        "title": "Sumitra's Tin of Ladoos",
        "memory_date": "1987-10-20",
        "category": "Tradition",
        "people": ["Sumitra", "Kamala Mehta", "Aditi Mehta"],
        "tags": ["ladoos", "diwali", "sweets", "kitchen", "grandma"],
        "content": (
            "The steel tin with the dented lid belonged to Sumitra and only ever held besan ladoos. "
            "She made them for Diwali, and for weddings, and for the week after any funeral, which "
            "the family understood without ever discussing. Besan, ghee, powdered sugar, cardamom, "
            "and chopped pistachio on top of the ones she considered decorative. The rule was that "
            "the tin was opened in front of everyone, and that the first one went to whoever had "
            "come furthest to be there. Aditi has the tin now. It still smells faintly of ghee."
        ),
    },
    {
        "title": "What Papa Said About Leaving",
        "memory_date": "1996-12-30",
        "category": "Reflection",
        "people": ["Devendra Mehta", "Ravi Mehta"],
        "tags": ["partition", "leaving", "family", "memory"],
        "content": (
            "Devendra rarely spoke about the move in 1947, and when he did it was in small pieces, "
            "usually in the courtyard, usually late. He said the family left with two trunks and a "
            "brass pot, and that the brass pot mattered more than it should have. He said you do not "
            "get to choose what you carry and you do not get to choose what you forget, and that most "
            "people were only ever trying to keep one thing. Ravi wrote this down in December 1996, "
            "on the back of an electricity bill, because it was the longest he had ever heard his "
            "father speak about it."
        ),
    },
]
