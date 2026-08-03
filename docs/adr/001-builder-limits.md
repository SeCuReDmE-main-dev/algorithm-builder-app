# ADR 001 : Limites d'Algorithm Builder

## Contexte
Algorithm Builder fait partie de l'écosystème AlgoQuest Hero Books. Pour maintenir une stricte séparation des responsabilités, le Builder ne doit pas chevaucher les fonctions d'AlgoQuest.

## Décision
**Algorithm Builder (`algorithm-builder-app`) est strictement limité à :**
1. La fonction de "feuille de personnage" (visualisation des états).
2. L'inventaire versionné et la présentation du dé déterministe.
3. La construction d'algorithmes et la visualisation (laboratoire, modèles).
4. La production de reçus (`AlgorithmArtifactReceipt`) vérifiables.

## Conséquences
- Le Builder n'est pas autorisé à stocker l'état global de la quête ou de la biographie.
- Le Builder ne distribue pas de missions et n'attribue pas de points de maîtrise.
- Toute tentative d'invoquer une capacité interdite sera rejetée et documentée.
- Les preuves construites doivent être retournées sous forme de reçu à AlgoQuest.
