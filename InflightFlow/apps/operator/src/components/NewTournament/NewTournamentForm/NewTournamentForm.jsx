import { Fragment, useEffect, useState } from "react";
import classes from "./NewTournamentForm.module.css";
import createTournament from "../../../Api_requests/tournaments/createTournament";
import TextField from "@mui/material/TextField";
import SubmitButton from "../ButtonSubmit/SubmitButton";
import BackButton from "../ButtonBack/BackButton";
import createNewDiscipline from "../../../Api_requests/disciplines/createNewDiscipline";
import createNewTeam from "../../../Api_requests/teams/createNewTeam";
import createNewStage from "../../../Api_requests/stages/createNewStage";
import updateTournament from "../../../Api_requests/tournaments/updateTournament";
import deleteTeamById from "../../../Api_requests/teams/deleteTeamById";
import deleteStageById from "../../../Api_requests/stages/deleteStage";
import EditableDataGrid from "../../UI/EditableDataGrid/EditableDataGrid";
import updateTeamInfo from "../../../Api_requests/teams/updateTeamInfo";
import updateDisciplineInfo from "../../../Api_requests/disciplines/updateDisciplineInfo";
import updateStageInfo from "../../../Api_requests/stages/updateStageInfo";
import { Box } from "@mui/material";
import CircularProgressDialog from "../../UI/Backdrop/CircularProgressDialog/CircularProgressDialog";

// Regular expression for bust, skip inputs
const re = /^\d{0,3}$/;

// Regular expression for bust skip validation
const reValid = /^\d{0,3}$/;

const NewTournamentForm = (props) => {
  const { setChangesMade, preFilledData, editing } = props;

  //Settings
  const [enteredTitle, setEnteredTitle] = useState(preFilledData?.title || "");
  const [enteredDiscipline, setEnteredDiscipline] = useState(
    editing ? preFilledData?.disciplineList[0] || { name: "" } : [{ name: "" }]
  );
  const [enteredMistakeFine, setEnteredMistakeFine] = useState(
    preFilledData?.bustVal !== undefined ? Number(preFilledData?.bustVal) : 5
  );
  const [enteredSkipFine, setEnteredSkipFine] = useState(
    preFilledData?.skipVal !== undefined ? Number(preFilledData?.skipVal) : 20
  );

  // Table Params
  const [teamsList, setTeamsList] = useState([
    ...(preFilledData?.teamsList || []),
  ]);
  const [teamsToDelete, setTeamsToDelete] = useState([]);

  const [stageList, setStageList] = useState([
    ...(preFilledData?.stageList || []),
  ]);
  const [stagesToDelete, setStagesToDelete] = useState([]);

  // Changes applied
  const [isModified, setIsModified] = useState(false);
  const [createBtnEnabled, setCreateBtnEnabled] = useState(true);

  const [tourTitleInputIsTouched, setTourTitleInputIsTouched] = useState(false);
  const [tourDisciplineIsTouched, setTourDisciplineIsTouched] = useState(false);

  // Validity
  const [inputsValid, setInputsValid] = useState(
    editing === true ? true : false
  );
  const [teamsAreValid, setTeamsAreValid] = useState(
    editing === true ? true : false
  );
  const [stagesAreValid, setStagesAreValid] = useState(
    editing === true ? true : false
  );
  const [isLoading, setIsLoading] = useState(false);
  const makeTournamentId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `tour-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  };

  const tourTitleIsValid = enteredTitle.trim() !== "";
  const tourDisciplineIsValid = enteredDiscipline?.name?.trim().length > 0;
  const tourTitleInputIsInValid = !tourTitleIsValid && tourTitleInputIsTouched;
  const tourDisciplineIsInValid =
    !tourDisciplineIsValid && tourDisciplineIsTouched;

  const [mistakeFineInputIsTouched, setMistakeFineInputIsTouched] =
    useState(false);
  const bustValueInputIsValid =
    enteredMistakeFine !== "" &&
    Number(enteredMistakeFine) >= 0 &&
    Number(enteredMistakeFine) <= 40 &&
    reValid.test(enteredMistakeFine);
  const mistakeFineInputIsInValid =
    !bustValueInputIsValid && mistakeFineInputIsTouched;

  const [skipFineInputTouched, setSkipFineInputTouched] = useState(false);
  const skipValueIsValid =
    enteredSkipFine !== "" &&
    Number(enteredSkipFine) >= 0 &&
    Number(enteredSkipFine) <= 40 &&
    reValid.test(enteredSkipFine);
  const skipFineInputIsInValid = !skipValueIsValid && skipFineInputTouched;
  const validTeamsCount = teamsList.filter((team) => {
    const hasName = typeof team?.name === "string" && team.name.trim().length > 0;
    const hasNumber =
      team?.number !== null &&
      team?.number !== undefined &&
      String(team.number).trim() !== "";
    return hasName && hasNumber;
  }).length;
  const validStagesCount = stageList.filter((stage) => {
    return typeof stage?.name === "string" && stage.name.trim().length > 0;
  }).length;

  const titleChangeHandler = (event) => {
    setEnteredTitle(event.target.value);
    setIsModified(true);
    setChangesMade(true);
  };
  const disciplineChangeHandler = (event) => {
    setEnteredDiscipline((prev) => ({
      ...prev,
      inDB: false,
      name: event.target.value,
    }));
    setIsModified(true);
    setChangesMade(true);
  };
  const titleInputBlurHandler = () => {
    setTourTitleInputIsTouched(true);
  };
  const titleInputFocusHandler = () => {
    setTourTitleInputIsTouched(false);
  };
  const disciplineInputBlurHandler = () => {
    setTourDisciplineIsTouched(true);
  };
  const disciplineInputFocusHandler = () => {
    setTourDisciplineIsTouched(false);
  };

  const bustInputChangeHandler = (event) => {
    const val = event.target.value;

    if (val === "" || re.test(val)) {
      setEnteredMistakeFine(val);
      setIsModified(true);
      setChangesMade(true);
    }
  };

  const bustInputBlurHandler = () => {
    setMistakeFineInputIsTouched(true);
  };

  const skipInputChangeHandler = (event) => {
    const val = event.target.value;

    if (val === "" || re.test(val)) {
      setEnteredSkipFine(val);
      setIsModified(true);
      setChangesMade(true);
    }
  };
  const skipInputBlurHandler = () => {
    setSkipFineInputTouched(true);
  };

  // CREATING NEW TOURNAMENT
  const formSubmitHandler = async (event) => {
    event.preventDefault();

    const validationErrors = [];
    if (!tourTitleIsValid) validationErrors.push("Название турнира");
    if (!tourDisciplineIsValid) validationErrors.push("Имя дисциплины");
    if (!bustValueInputIsValid) validationErrors.push("Bust value");
    if (!skipValueIsValid) validationErrors.push("Skip value");
    if (validTeamsCount < 1) {
      validationErrors.push("Минимум 1 участник с номером");
    }
    if (validStagesCount < 1) {
      validationErrors.push("Минимум 1 раунд");
    }

    if (validationErrors.length > 0) {
      setTourTitleInputIsTouched(true);
      setTourDisciplineIsTouched(true);
      setMistakeFineInputIsTouched(true);
      setSkipFineInputTouched(true);
      alert(`Заполните обязательные поля:\n- ${validationErrors.join("\n- ")}`);
      return;
    }

    setIsLoading(true);
    try {
      const teamArr = [];
      const disciplineArr = [];
      const stageArr = [];

      // Manage teams
      for (const team of teamsList) {
        if (team.name.trim().length > 0) {
          // add new team
          if (!team.inDB) {
            const createdTeam = await createNewTeam(team);
            const createdId =
              typeof createdTeam === "string" ? createdTeam : createdTeam?.id;

            teamArr.push({
              id: createdId,
              name: team.name,
              number: team.number,
            });
          } else {
            if (team.inDB && team.isEdited) {
              await updateTeamInfo(team);
            }
            teamArr.push({ id: team.id, name: team.name, number: team.number });
          }
        }
      }

      // Manage stages
      for (const { id, name, battle, inDB, isEdited } of stageList) {
        const battleBoolean = battle === "Yes" ? true : false;

        if (name.trim().length > 0) {
          //added new stage
          if (!inDB) {
            const createdStage = await createNewStage({ name, battleBoolean });
            const createdId =
              typeof createdStage === "string"
                ? createdStage
                : createdStage?.id;

            stageArr.push({
              id: createdId,
              name,
              battle: battleBoolean,
            });
          } else {
            if (inDB && isEdited) {
              updateStageInfo({ id, name, battleBoolean });
            }
            stageArr.push({
              id,
              name,
              battle: battleBoolean,
            });
          }
        }
      }

      if (preFilledData) {
        await updateDisciplineInfo(enteredDiscipline);
        disciplineArr.push({
          id: preFilledData.disciplineList[0].id,
          name: enteredDiscipline.name,
        });
      } else if (
        !enteredDiscipline.inDB &&
        enteredDiscipline.name.trim().length > 0
      ) {
        const createdDiscipline = await createNewDiscipline(enteredDiscipline);
        const createdId =
          typeof createdDiscipline === "string"
            ? createdDiscipline
            : createdDiscipline?.id;
        disciplineArr.push({ id: createdId, name: enteredDiscipline.name });
      }

      // DELETING EXTRA ENTITIES
      for (const team_id of teamsToDelete) {
        await deleteTeamById(team_id);
      }
      for (const stage_id of stagesToDelete) {
        await deleteStageById(stage_id);
      }

      setTourTitleInputIsTouched(true);

      const sentData = {
        id: preFilledData?.id || makeTournamentId(),
        name: enteredTitle,
        teams: teamArr,
        disciplines: disciplineArr,
        stages: stageArr.filter((stage) => !stagesToDelete.includes(stage.id)),
        bust_value: Number(enteredMistakeFine),
        skip_value: Number(enteredSkipFine),
      };

      if (props.editing) {
        await updateTournament({ id: preFilledData.id, ...sentData });
      } else {
        await createTournament(sentData);
      }
      setChangesMade(false);
      // "Redirect" to AllTournaments list
      props.changeCurrentMainContent("tournamentsList");
    } catch (error) {
      console.log("Tournament save failed", error);
      alert(`Не удалось сохранить турнир: ${error?.message || "unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // TEAM ACTIONS

  const deleteTeam = (e) => {
    const shallowCopy = teamsList;
    const filteredCopy = shallowCopy.filter((item) => item.id !== e.id);

    setTeamsList(filteredCopy);

    if (e.row.inDB) {
      setTeamsToDelete((prev) => [...prev, e.id]);
    }
    setIsModified(true);
  };

  const updateTeam = (row) => {
    let shallowCopy = teamsList;
    let index = teamsList.findIndex((team) => team.id === row.id);

    if (index !== -1) {
      shallowCopy[index] = { ...row, isEdited: row.inDB ? true : false };
    } else {
      shallowCopy.push(row);
    }
    setTeamsList(shallowCopy);
  };

  // STAGE ACTIONS

  const deleteStage = (e) => {
    setStageList((prevStageList) => {
      return prevStageList.filter((stage) => stage.id !== e.id);
    });
    if (e.row.inDB) {
      setStagesToDelete((prev) => [...prev, e.id]);
    }
    setIsModified(true);
  };

  const updateStage = (row) => {
    let shallowCopy = stageList;
    let index = stageList.findIndex((stage) => stage.id === row.id);

    if (index !== -1) {
      shallowCopy[index] = { ...row, isEdited: row.inDB ? true : false };

      setStageList(shallowCopy);
    } else {
      shallowCopy.push(row);

      setStageList(shallowCopy);
    }
  };

  useEffect(() => {
    setCreateBtnEnabled(true);
  }, [inputsValid, validTeamsCount, validStagesCount]);

  useEffect(() => {
    setInputsValid(
      Boolean(
        bustValueInputIsValid &&
          skipValueIsValid &&
          tourTitleIsValid &&
          tourDisciplineIsValid
      )
    );
  }, [
    bustValueInputIsValid,
    skipValueIsValid,
    tourTitleIsValid,
    tourDisciplineIsValid,
  ]);

  return (
    <Fragment>
      <CircularProgressDialog open={isLoading} />
      <form
        method="POST"
        autoComplete="off"
        onSubmit={formSubmitHandler}
        className="customForm"
      >
        <section className={classes.settings}>
          <div className={`${classes["settings__options"]}`}>
            <div className={classes.tourInput}>
              <TextField
                value={enteredTitle}
                error={tourTitleInputIsInValid}
                name="title"
                required={true}
                inputProps={{ maxLength: 20 }}
                className={classes["option"]}
                variant="outlined"
                label="Tournament Name"
                placeholder={!enteredTitle ? "max length - 20" : ""}
                onChange={titleChangeHandler}
                onBlur={titleInputBlurHandler}
                onFocus={titleInputFocusHandler}
              />
              <TextField
                value={enteredDiscipline.name}
                error={tourDisciplineIsInValid}
                name="discipline"
                required={true}
                inputProps={{ maxLength: 20 }}
                className={classes["option"]}
                variant="outlined"
                label="Disciplines Name"
                placeholder={!enteredDiscipline.name ? "max length - 20" : ""}
                onChange={disciplineChangeHandler}
                onBlur={disciplineInputBlurHandler}
                onFocus={disciplineInputFocusHandler}
              />
            </div>
            <div className={classes.faultsBlock}>
              <div className={classes.bustInput}>
                <TextField
                  error={mistakeFineInputIsInValid}
                  placeholder={"0 - 40"}
                  helperText={
                    mistakeFineInputIsInValid &&
                    Number(enteredMistakeFine) > 40 &&
                    "Maximum - 40"
                  }
                  name="mistake_value"
                  value={enteredMistakeFine}
                  required={true}
                  className={classes["option"]}
                  variant="outlined"
                  label="Bust value"
                  onChange={bustInputChangeHandler}
                  onBlur={bustInputBlurHandler}
                />
              </div>
              <div className={classes.skipInput}>
                <TextField
                  error={skipFineInputIsInValid}
                  placeholder={"0 - 40"}
                  helperText={
                    skipFineInputIsInValid &&
                    Number(enteredSkipFine) > 40 &&
                    "Maximum - 40"
                  }
                  name="skip_value"
                  required={true}
                  className={classes["option"]}
                  value={enteredSkipFine}
                  variant="outlined"
                  label="Skip value"
                  onChange={skipInputChangeHandler}
                  onBlur={skipInputBlurHandler}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={classes["table-parameters"]}>
          <div>
            <h4>{"Teams"}</h4>
            <EditableDataGrid
              tableHeader="Teams"
              data={teamsList}
              gridHeight="clamp(500px, calc(100vh - 430px), 700px)"
              setItemsList={setTeamsList}
              deleteItem={deleteTeam}
              updateItem={updateTeam}
              toggleRowsValid={setTeamsAreValid}
              setChangesMade={setChangesMade}
              setIsModified={setIsModified}
            />
          </div>
          <div>
            <h4>{"Stages"}</h4>
            <EditableDataGrid
              editing={props.editing}
              tableHeader="Stages"
              data={stageList}
              gridHeight="clamp(500px, calc(100vh - 430px), 700px)"
              setItemsList={setStageList}
              deleteItem={deleteStage}
              updateItem={updateStage}
              toggleRowsValid={setStagesAreValid}
              setChangesMade={setChangesMade}
              setIsModified={setIsModified}
            />
          </div>
        </section>

        <Box component="section" className={classes["buttonRow"]}>
          <BackButton
            isModified={isModified}
            changeContent={props.onContentChange}
            setChangesMade={setChangesMade}
          />

          <SubmitButton isEnabled={createBtnEnabled} editing={props.editing} />
        </Box>
      </form>
    </Fragment>
  );
};

export default NewTournamentForm;
