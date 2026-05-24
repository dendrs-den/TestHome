package commands

type Type string

const (
	CmdCreateTournament Type = "create_tournament"
	CmdPrepareRound     Type = "prepare_round"
	CmdStartRound       Type = "start_round"
	CmdAcceptCrossing   Type = "accept_crossing"
	CmdFinishRound      Type = "finish_round"
	CmdCancelRound      Type = "cancel_round"
)

type Command struct {
	Type Type
	Data map[string]any
}
