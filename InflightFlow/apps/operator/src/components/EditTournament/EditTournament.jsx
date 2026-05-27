import { useCallback, useEffect, useState } from "react";
import createTournament from "../../Api_requests/tournaments/createTournament";
import getTournamentById from "../../Api_requests/tournaments/getTournamentById";
import NewTournamentForm from "../NewTournament/NewTournamentForm/NewTournamentForm";
import classes from "./EditTournament.module.css";

export default function EditTournament(props) {
  const makeLocalId = (prefix) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  const [preFilledData, setPrefilledData] = useState({
    id: "",
    title: "Prefilled title",
    discipline: "",
    bustVal: 11,
    skipVal: 11,
    teamsList: [],
    disciplineList: [{ id: "id", name: "testName" }],
    stageList: [{ id: "id", name: "testName" }],
  });

  const teamArr = [];
  const stageArr = [];
  const discArr = [];

  const fetchDataHandler = useCallback(async () => {
    const data = await getTournamentById(props.selectedId);

    if (data) {
      for (let team of data.teams) {
        teamArr.push(team);
      }
      for (let discipline of data.disciplines) {
        discArr.push(discipline);
      }
      for (let stage of data.stages) {
        stageArr.push(stage);
      }

      const tempData = {
        isLoaded: true,
        id: data.id,
        title: data.title,
        bustVal: data.bust_value,
        skipVal: data.skip_value,
        teamsList: teamArr.map((el, index) => ({
          ...el,
          id: el?.id ?? `team-${index + 1}-${makeLocalId("tmp")}`,
          inDB: true,
        })),
        disciplineList: discArr.map((el, index) => ({
          ...el,
          id: el?.id ?? `discipline-${index + 1}-${makeLocalId("tmp")}`,
          inDB: true,
        })),
        stageList: stageArr.map((el) => ({
          ...el,
          id: el?.id ?? makeLocalId("stage"),
          inDB: true,
          battle:
            el.battle === true ? "Yes" : el.battle === false ? "No" : null,
        })),
      };
      setPrefilledData(tempData);
    }
  }, []);

  async function addTournamentHandler(item) {
    await createTournament(item);
  }

  useEffect(() => {
    fetchDataHandler();
  }, []);

  return (
    <div className={classes.editTournament_Block}>
      <div className={classes.newTournament}>
        {preFilledData.isLoaded > 0 && (
          <NewTournamentForm
            editing={true}
            setChangesMade={props.setChangesMade}
            setFooterActions={props.setFooterActions}
            preFilledData={preFilledData}
            changeCurrentMainContent={props.onContentChange}
            onContentChange={props.onContentChange}
            createTournamentHandler={addTournamentHandler}
          />
        )}
      </div>
    </div>
  );
}
