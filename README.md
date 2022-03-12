# Multiplayer ReversiMLH Game on Internet Computer

## Frontend and Backend

- The frontend of this game(GUI) is done using JavaScript and [Mithril], which is stored directly on the [Internet Computer].
- The Backend of this game is written in [Motoko]
## Installation

To run the game locally, you need to install [DFINITY SDK] first, which also requires [Node.js] and `npm`.

Make sure you install the correct version of dfx(0.8.0) if want to clone this code and run locally.
```
 DFX_VERSION=0.8.0 sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"
```

After starting dfx (`dfx start --background`), run the following to build and install the canister:

```
make install
echo "http://localhost:8000/?canisterId=$(dfx canister id reversi_assets)"
```

The last command prints a URL, load it in a browser, and enjoy!

## License

All original code is released under MIT license.
The game UI also uses a free font [Akbar-Plain] made by Jon Bernhardt.

[DFINITY SDK]: https://sdk.dfinity.org/docs/
[Internet Computer]: https://dfinity.org/
[Motoko]: https://dfinity.org/
[Mithril]: https://mithril.js.org/
[Node.js]: https://nodejs.org/
[Akbar-Plain]: https://www.wobblymusic.com/groening/akbar.html
