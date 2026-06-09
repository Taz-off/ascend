# Ascend Guidelines

## Description du jeu

Ascend est un jeu de plateforme 2D low-poly base sur la verticalite, le parcours, le combat a l'epee, les ennemis et les boss. Le joueur doit monter, descendre, grimper, explorer plusieurs etages et utiliser le saut, le double saut, le dash, le wall jump et la parade pour progresser.

Le jeu doit rester un petit jeu complet et jouable, pas un prototype. Toute evolution doit conserver une progression claire, des niveaux finis, une interface propre et une identite visuelle coherente.

## Style artistique

- Style 2D low-poly propre, colore et lisible.
- Decors simples mais jolis, construits avec des formes geometriques.
- Animations fluides mais simples a maintenir.
- Eviter les animations trop complexes qui peuvent creer des incoherences.
- Les assets generes avec des formes sont acceptes s'ils restent coherents avec Ascend.

## Gameplay principal

- Ascend est un platformer d'action et de parcours vertical.
- Le jeu ne doit pas devenir trop horizontal.
- Les niveaux doivent utiliser la hauteur : monter, descendre, grimper, explorer plusieurs etages.
- Le level design doit encourager le double saut, le dash, le wall jump et les chemins a differentes altitudes.
- Les raccourcis doivent se debloquer apres avoir atteint une nouvelle hauteur.
- Les obstacles doivent etre poses de facon lisible : pas de pics flottants, pas de pieges inutiles dans les trous mortels.

## Regles de level design

- Au moins 60 % de chaque niveau doit exploiter la verticalite.
- Eviter les longues lignes droites horizontales.
- Chaque niveau doit avoir un debut, une fin, des checkpoints, des ennemis, des obstacles et une difficulte progressive.
- Les plateformes, murs, ascenseurs, falaises, tours et grottes doivent aider le joueur a lire la prochaine destination.
- Le niveau 5 est un niveau important avec boss, mais il ne doit pas etre considere comme le niveau final si le jeu contient 10 niveaux.

## Interface

- L'interface en jeu doit rester minimaliste.
- Ne pas afficher trop d'informations inutiles pendant la partie.
- Ne pas afficher le nom du niveau dans l'interface en jeu.
- Pendant le gameplay, afficher uniquement la vie, le dash, la parade, les fragments et le chronometre.
- Les recharges du dash et de la parade doivent etre visibles avec une barre qui se remplit progressivement.
- Le chronometre doit rester lisible sans surcharger l'ecran.

## Boss

- Il doit y avoir un boss tous les 5 niveaux : niveau 5, niveau 10, puis niveau 15, 20, etc. si d'autres niveaux sont ajoutes.
- Les boss doivent avoir une attaque de melee, une attaque a distance et une attaque chargee.
- Les boss doivent etre lisibles, exigeants mais pas injustes.
- Les niveaux qui ne sont pas des paliers de 5 peuvent etre difficiles, mais ne doivent pas devenir des niveaux boss par defaut.
- Le niveau 5 ne doit pas etre nomme ou presente comme un niveau final si le jeu continue apres.

## Speedrun

- Le mode speedrun doit rester separe du mode normal.
- Le chronometre par niveau et le chronometre global doivent etre fiables.
- Le timer global du speedrun ne doit pas se reinitialiser entre les niveaux.
- Le timer doit s'arreter pendant la pause.
- Si le joueur meurt, le timer continue.
- Si le joueur abandonne une run, le temps global ne doit pas etre enregistre.
- Les meilleurs temps doivent rester sauvegardes localement.

## Audio

- Les musiques et sons doivent rester coherents avec l'ambiance low-poly, verticale et aventureuse d'Ascend.
- Une seule musique doit jouer a la fois.
- Chaque niveau doit avoir sa musique, avec une musique separee pour le menu, les boss, la victoire et le game over.
- Les volumes general, musique et effets sonores doivent rester reglables et sauvegardes.

## PWA

- Ascend doit rester installable comme application depuis le navigateur.
- Le manifest, le service worker, les icones et le nom de l'application doivent rester a jour.
- Le fonctionnement hors ligne doit etre conserve autant que possible sans casser le build.
