import React from "react";
import createTournament from "../../../Api_requests/tournaments/createTournament";
import NewTournamentForm from "../NewTournamentForm/NewTournamentForm";

import classes from "./NewTournamentBlock.module.css";

async function addTournamentHandler(item) {
  await createTournament(item);
}

const NewTournamentBlock = (props) => {
  return (
    <div className={classes.newTournament}>
      <h3 className={classes.newTournament__header}>Adding new tournament</h3>
      <NewTournamentForm
        setChangesMade={props.setChangesMade}
        preFilledData={null}
        changeCurrentMainContent={props.onContentChange}
        createTournamentHandler={addTournamentHandler}
        onContentChange={props.onContentChange}
      />
    </div>
  );
};

export default NewTournamentBlock;
