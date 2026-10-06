"""The 6 life areas. Ids match the rows seeded by migration b4c5d6e7f8a9."""

AREAS = [
    # (id, slug, name, icon, color_hex)
    (1, "health", "Health", "heart", "#EF4343"),
    (2, "mind", "Mind", "brain", "#F59F0A"),
    (3, "relationships", "Relationships", "users", "#EC4699"),
    (4, "work", "Work", "briefcase", "#21C45D"),
    (5, "money", "Money", "wallet", "#21CAB9"),
    (6, "growth", "Growth", "sprout", "#3EBAF4"),
]
AREA_SLUGS = [a[1] for a in AREAS]
AREA_SLUG_BY_ID = {a[0]: a[1] for a in AREAS}
