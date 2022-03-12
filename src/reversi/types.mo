import Buffer "mo:base/Buffer";
import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Game "./game";
import Text "mo:base/Text";

module {

public type Result<T,E> = Result.Result<T,E>;
public type PlayerId = Principal;
public type PlayerName = Text;
public type Score = Nat;
public type GamesPlayed = Nat;

public type MoveResult = {
  #GameNotFound;
  #GameNotStarted;
  #InvalidCoordinate;
  #InvalidColor;
  #IllegalMove;
  #IllegalColor;
  #GameOver: Game.ColorCount;
  #Pass;
  #OK;
};

public type PlayerState = {
  name: PlayerName;
  var score: Score;
  var games_played: GamesPlayed;
};

public type PlayerView = {
  name: PlayerName;
  score: Score;
  games_played: GamesPlayed;
};

public type Players = {
  id_map: HashMap.HashMap<PlayerId, PlayerState>;
  name_map: HashMap.HashMap<PlayerName, PlayerId>;
};

public type ListResult = {
  top: [PlayerView];
  recent: [PlayerView];
  available: [PlayerView];
};

public type RegistrationError = {
  #InvalidName;
  #NameAlreadyExists;
};

// History of valid moves. The use of Nat12 here implies the max dimension is 12.
public type Moves = Buffer.Buffer<Nat8>;

public type GameState = {
  dimension: Nat;
  board: Game.Board;
  moves: Moves;
  var black: (?PlayerId, PlayerName);
  var white: (?PlayerId, PlayerName);
  var next: Game.Color;
  var result: ?Game.ColorCount;
};

public type GameView = {
  dimension: Nat;
  board: Text;
  moves: [Nat8];
  black: (?(), PlayerName);
  white: (?(), PlayerName);
  next: Game.Color;
  result: ?Game.ColorCount;
};

public type Games = Buffer.Buffer<GameState>;

public type StartError = {
  #InvalidOpponentName;
  #PlayerNotFound;
  #NoSelfGame;
  #OpponentInAnotherGame;
};

}
