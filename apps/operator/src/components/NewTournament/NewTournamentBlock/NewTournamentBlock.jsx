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
      <NewTournamentForm
        setChangesMade={props.setChangesMade}
        setFooterActions={props.setFooterActions}
        preFilledData={null}
        changeCurrentMainContent={props.onContentChange}
        createTournamentHandler={addTournamentHandler}
        onContentChange={props.onContentChange}
        useInlineFooter={props.useInlineFooter}
        onClose={props.onClose}
      />
    </div>
  );
};

export default NewTournamentBlock;
