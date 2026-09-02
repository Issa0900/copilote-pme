OBJECTIVE_CHOICES = [
    "augmenter_les_ventes",
    "ameliorer_la_rentabilite",
    "reduire_les_couts",
    "ameliorer_la_tresorerie",
    "automatiser",
    "developper_un_marche",
    "reduire_les_risques",
    "ameliorer_la_productivite",
    "preparer_une_croissance",
]

OBJECTIVE_LABELS = {
    "augmenter_les_ventes": "Augmenter les ventes",
    "ameliorer_la_rentabilite": "Améliorer la rentabilité",
    "reduire_les_couts": "Réduire les coûts",
    "ameliorer_la_tresorerie": "Améliorer la trésorerie",
    "automatiser": "Automatiser",
    "developper_un_marche": "Développer un marché",
    "reduire_les_risques": "Réduire les risques",
    "ameliorer_la_productivite": "Améliorer la productivité",
    "preparer_une_croissance": "Préparer une croissance",
}

REVENUE_RANGE_CHOICES = [
    "0-50k",
    "50k-250k",
    "250k-1m",
    "1m-5m",
    "5m+",
]

# Devise de l'entreprise (spec §64.3). Liste fermée plutôt qu'un code ISO 4217
# libre : la conversion multi-devise est explicitement hors scope du MVP
# (docs/project-charter.md, "Gestion multi-devise avancée... reportée en Phase
# 3") — un code accepté sans conversion associée serait trompeur. CAD/USD/EUR
# couvrent le marché cible (PME au Québec/Canada, souvent avec des clients ou
# fournisseurs américains) sans ouvrir sur une promesse de conversion non tenue.
CURRENCY_CHOICES = ["CAD", "USD", "EUR"]
