import { Actor, HttpAgent } from "@dfinity/agent";


import { reversi } from '../../declarations/reversi'
import { valid_move, set_and_flip, replay } from "./game.js";
import { get_error_message, set_error, clear_error } from "./error.js";
import {
  Board,
  black,
  white,
  same_color,
  opponent_color,
} from "./ui.js";
import "./style.css";
import logo from "./logo.png";
import m from "mithril";

document.title = "Reversi Game on IC";

// The refresh timeout is global, because we want to stop it in non-game compnent too.
var refreshTimeout = null;

// Main game UI component.
function Game() {
  var game = null;
  var boards = [];
  var last_move_length = null;
  var player_color = null;
  var next_color = null;

  var refresh = function() {
    clearTimeout(refreshTimeout);
    reversi
      .view()
      .then(function(res) {
        if (res.length == 0) {
          set_error("GameCancelled");
          m.route.set("/play");
        } else {
          let black_name = game ? game["black"][1] : null;
          let white_name = game ? game["white"][1] : null;
          game = res[0];
          if (game.moves.length > last_move_length) {
            // handle new moves
            let opponent_piece = "white" in player_color ? "*" : "O";
            const N = Number(game.dimension);
            while (last_move_length < game.moves.length) {
              const idx = game.moves[last_move_length];
              const i = Math.floor(idx / N);
              const j = idx % N;
              var board = Array.from(boards[boards.length - 1].board);
              set_and_flip(N, board, opponent_piece, i, j);
              boards.push({ row: i, col: j, board: board });
              last_move_length += 1;
            }
            let matched = game.board == board.join("");
            if (!matched) {
              console.log("CRITICAL ERROR!!!");
              console.log("Game  board: " + game.board);
              console.log("Local board: " + board.join(""));
            }
            m.redraw();
          } else if (game.result.length > 0) {
            // handle end of game
            m.redraw();
          } else if (
            game.moves.length == last_move_length &&
            !same_color(next_color, game.next)
          ) {
            // redraw when next player has changed
            next_color = game.next;
            m.redraw();
          } else if (
            black_name != game["black"][1] ||
            white_name != game["white"][1]
          ) {
            if (game["white"][1] == "" || game["black"][1] == "") {
              // player left, we'll terminate
              set_error("GameCancelled");
              m.route.set("/play");
              return;
            } else {
              // reset game when player name has changed
              const N = Number(game.dimension);
              var board = replay(N, game.moves);
              boards = [{ row: -1, col: -1, board: board }];
              m.redraw();
            }
          }
          refreshTimeout = setTimeout(refresh, 1000);
        }
      })
      .catch(function(err) {
        console.log("View error, will try again.");
        console.log(err);
        refresh();
      });
  };
  var start = function(player, opponent, board_size) {
    clearTimeout(refreshTimeout);
    console.log("Start " + player + " against " + opponent);
    reversi
      .start(opponent, Number(board_size))
      .then(function(res) {
        if ("ok" in res) {
          game = res["ok"];
          const N = Number(game.dimension);
          var board = replay(N, game.moves);
          boards.push({ row: -1, col: -1, board: board });
          last_move_length = game.moves.length;
          player_color = game.white[1] == player ? white : black;
          next_color = game.next;
          m.redraw();
          refresh();
        } else if ("PlayerNotFound" in res["err"]) {
          // maybe name was reversed? try again from play UI.
          m.route.set("/play", { player: opponent, opponent: player });
        } else {
          let error_code = Object.keys(res["err"])[0];
          set_error(
            error_code,
            error_code == "OpponentInAnotherGame" ? opponent : null
          );
          m.route.set("/play");
        }
      })
      .catch(function(err) {
        console.log("Start error");
        console.log(err);
        set_error("StartGameError");
        m.route.set("/play");
      });
  };

  var next_move = function(evt) {
    const dimension = Number(game.dimension);
    const idx = parseInt(evt.target.id);
    const row = Math.floor(idx / dimension);
    const col = idx % dimension;
    console.log(JSON.stringify(player_color) + " move " + row + ", " + col);
    const piece = "white" in player_color ? "O" : "*";
    var board = boards[boards.length - 1].board;
    if (
      same_color(player_color, next_color) &&
      valid_move(dimension, board, piece, row, col)
    ) {
      last_move_length += 1;
      board = Array.from(board);
      set_and_flip(dimension, board, piece, row, col);
      boards.push({ row: row, col: col, board: board });
      next_color = opponent_color(player_color);
      reversi
        .move(row, col)
        .then(function(res) {
          if ("OK" in res || "Pass" in res || "GameOver" in res) {
          } else {
            console.log("Unhandled game error, should not have happened!");
            console.log(JSON.stringify(res));
          }
        })
        .catch(function(err) {
          console.log("Move error, ignore");
          console.log(err);
        });
    }
    m.redraw();
  };

  return {
    onremove: function(vnode) {
      clearTimeout(refreshTimeout);
    },
    view: function(vnode) {
      var content;
      if (game === null) {
        let opponent = vnode.attrs.against;
        if (opponent[0] == ".") {
          opponent = opponent.substring(1);
        }
        start(vnode.attrs.player, opponent, vnode.attrs.dimension);
        content = m("div");
      } else {
        content = Board(
          player_color,
          next_color,
          game,
          boards,
          next_move,
          function(e) {
            m.route.set("/play");
          }
        );
      }
      return m("div", content);
    }
  };
}

function make_player_list(players, ordered) {
  let half = players.slice(0, 4);
  let more = players.slice(4, 8);
  let l = ordered ? "ol" : "ul";
  let make_player_link = function(player) {
    return m(
      "li",
      m(m.route.Link, { href: "/play?opponent=" + player.name }, [
        player.name + "(",
        m("span.player-score", Number(player.score)),
        ")"
      ])
    );
  };

  let list = [m("div.left-list", m(l, half.map(make_player_link)))];
  if (more.length > 0) {
    list.push(
      m(
        "div.right-list",
        m(l, { start: half.length + 1 }, more.map(make_player_link))
      )
    );
  }
  return list;
}

// these are global because we want to come back to /play remembering previous settings.
var inited = null;
var player_name = null;
var player_score = null;
var player_games_played = null;

function Tips() {
  let next = 0;
  let tips = [
    [
      m("h4", "How to play:"),
      m("ul", [
        m("li", "1st player joining a game plays black."),
        m("li", "2nd player joining a game plays white."),
        m("li", "No password required, login is per-browser.")
      ])
    ],
    [
      m("h4", "To invite a friend:"),
      m("ol", [
        m("li", ["Enter both of your names and click ", m("i", "Play!")]),
        m("li", "Once you are in game, share the URL with your friend.")
      ])
    ],
    [
      m("h4", "How to score:"),
      m("ol", [
        m("li", "Get points by winning a game."),
        m("li", "Get more by beating higher-score players!")
      ])
    ],
    [
      m("h4", "To invite anyone:"),
      m("ol", [
        m("li", ["Leave the opponent name empty and click ", m("i", "Play!")]),
        m("li", "Once you are in game, share the URL with anyone.")
      ])
    ]
  ];
  var charts = [];

  let refresh_list = function() {
    reversi
      .list()
      .then(function(res) {
        let top_players = res.top;
        let recent_players = res.recent;
        let available_players = res.available;
        charts = [];
        if (top_players.length > 0) {
          charts.push([
            m("h4", "Top players"),
            make_player_list(top_players, true)
          ]);
        }
        if (recent_players.length > 0) {
          charts.push([
            m("h4", "Recently played"),
            make_player_list(recent_players, false)
          ]);
        }
        // Available players is inaccurate before canister has access to time
        if (false && available_players.length > 0) {
          charts.push([
            m("h4", "Available players"),
            make_player_list(available_players, false)
          ]);
        }
      })
      .catch(function(err) {
        console.log("Refresh list error, ignore");
        console.log(err);
      });
  };

  return {
    onbeforeremove: function(vnode) {
      vnode.dom.classList.add("exit");
      refresh_list();
      next += 1;
      return new Promise(function(resolve) {
        vnode.dom.addEventListener("animationend", resolve);
      });
    },
    view: function() {
      let tip;
      let chart;
      if (charts.length == 0) {
        tip = tips[next % tips.length];
      } else {
        tip = tips[(next >> 1) % tips.length];
        chart = charts[(next >> 1) % charts.length];
      }
      return m(".fancy", m("div.tip", next % 2 == 0 ? tip : chart));
    }
  };
}

// Play screen UI component.
function Play() {
  var tips_on = false;
  var opponent_name = null;
    const board_size_options = [
      {name: "6 x 6", value: "6"},
      {name: "8 x 8", value: "8"},
      {name: "12 x 12", value: "12"},
    ]
  var board_size = board_size_options[0].value;
  var set_player_info = function(info) {
    player_name = info["name"];
    player_score = Number(info["score"]);
    player_games_played = Number(info["games_played"]);
  };
  var set_tips_on = function() {
    tips_on = true;
    m.redraw();
    clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(set_tips_off, 6000);
  };
  var set_tips_off = function() {
    tips_on = false;
    m.redraw();
    clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(set_tips_on, 1000);
  };

  var init_play = function() {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    set_tips_off();
    reversi
      .register("")
      .then(function(res) {
        inited = true;
        if ("ok" in res) {
          set_player_info(res["ok"]);
        }
        m.redraw();
      })
      .catch(function(err) {
        console.log("Register error");
        console.log(err);
        set_error("RegisterError");
        m.route.set("/play");
      });
  };

  var play = function(e) {
    e.preventDefault();
    if (player_name == null || player_name == "") {
      set_error("InvalidName");
      return;
    }
    // clear error code on submit
    clear_error();
    console.log("Play " + player_name + " against " + opponent_name);
    reversi
      .register(player_name)
      .then(function(res) {
        if ("ok" in res) {
          set_player_info(res["ok"]);
          m.route.set("/game/:player/:against/:dimension", {
            player: player_name.trim(),
            against: "." + (opponent_name ? opponent_name.trim() : ""),
            dimension: board_size,
          });
        } else {
          let error_code = Object.keys(res["err"])[0];
          set_error(
            error_code,
            error_code == "NameAlreadyExists" ? player_name : null
          );
          m.route.set("/play");
        }
      })
      .catch(function(err) {
        console.log("Register error");
        console.log(err);
        set_error("RegisterError");
        m.route.set("/play");
      });
  };

  const dropdown_menu_ctrl = {
    selection: board_size_options[0].value,
    options: board_size_options,
  }


  let tips = Tips();
  return {
    oninit: init_play,
    onremove: function(vnode) {
      clearTimeout(refreshTimeout);
    },
    view: function(vnode) {
      if (vnode.attrs.player && player_name == null) {
        player_name = vnode.attrs.player;
        vnode.attrs.player = null;
      }
      if (vnode.attrs.opponent) {
        opponent_name = vnode.attrs.opponent;
        vnode.attrs.opponent = null;
      }
      if (inited) {
        var title = "Welcome to Reversi!";
        var score, games_played = m("h2");
        var form = [];

        if (player_score === null) {
          form.push(
            m("input.input[type=text][placeholder=Your name]", {
              oninput: function(e) {
                player_name = e.target.value;
              },
              value: player_name
            })
          );
        } else {
          title = [
            "Welcome back to Reversi, ",
            m("span.player-name", player_name),
            "!"
          ];
          score = m("h2", [
            m("span", "Your Score: "),
            m("span.player-score", player_score)
          ]);
          games_played = m("h2", [
            m("span", "Games Played: "),
            m("span.player-games-played", player_games_played)
          ]);
        }
        form.push(m("label.label", "Choose an opponent"));
        form.push(
          m("input.input[placeholder=Opponent name]", {
            oninput: function(e) {
              opponent_name = e.target.value;
            },
            value: opponent_name
          })
        );
        form.push(
          m("label.label", "Board Size"),
        );

        // Add code here!

        form.push(m("button.button[type=submit]", "Play!"),);

        return [
          m("div.top-centered", [
            m("h1", title),
            m("img.logo", { src: logo }),
            score,
            games_played,
            m("div.error", get_error_message()),
            m("div", m("form", { onsubmit: play }, form)),
          ]),
          m("div.bottom-centered", m("div.tips", tips_on ? m(tips) : null)),
          m(
            "div.bottom",
            m(
              "a",
              { href: "https://github.com/ninegua/reversi" },
              "Source Code"
            )
          )
        ];
      }
    }
  };
}

m.route(document.body, "/play", {
  "/play": Play,
  "/game/:player/:against/:dimension": Game
});
