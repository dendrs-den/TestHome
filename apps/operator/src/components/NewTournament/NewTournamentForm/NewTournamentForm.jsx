import { Fragment, useEffect, useMemo, useState } from "react";
import TextField from "@mui/material/TextField";
import { Box } from "@mui/material";
import classes from "./NewTournamentForm.module.css";
import createTournament from "../../../Api_requests/tournaments/createTournament";
import updateTournament from "../../../Api_requests/tournaments/updateTournament";
import SubmitButton from "../ButtonSubmit/SubmitButton";
import BackButton from "../ButtonBack/BackButton";
import EditableDataGrid from "../../UI/EditableDataGrid/EditableDataGrid";
import CircularProgressDialog from "../../UI/Backdrop/CircularProgressDialog/CircularProgressDialog";

const re = /^\d{0,3}$/;
const reValid = /^\d{0,3}$/;

const defaultDiscipline = { name: "" };

const makeLocalId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeTeam = (team) => ({
  id: team.id ?? makeLocalId("team"),
  name: String(team.name ?? "").trim(),
  number: String(team.number ?? "").trim(),
});

const normalizeStage = (stage) => ({
  id: stage.id ?? makeLocalId("stage"),
  name: String(stage.name ?? "").trim(),
  battle: stage.battle === true || stage.battle === "Yes",
});

const buildRounds = (teams, stages) => {
  const rounds = [];
  stages.forEach((stage, stageIndex) => {
    teams.forEach((team, teamIndex) => {
      rounds.push({
        id: makeLocalId("round"),
        team,
        stage,
        faults: [],
        crossings: [],
        time_real: null,
        time_result: null,
        stage_rank: 0,
        tournament_rank: 0,
        round_start: null,
        order: `${stageIndex}-${teamIndex}`,
      });
    });
  });
  return rounds;
};

const NewTournamentForm = (props) => {
  const { setChangesMade, preFilledData, editing, setFooterActions } = props;
  const formId = editing ? "edit-tournament-form" : "new-tournament-form";
  const useInlineFooter = props.useInlineFooter === true;
  const isPageMode = props.pageMode === true;

  const [enteredTitle, setEnteredTitle] = useState(preFilledData?.title || "");
  const [enteredDiscipline, setEnteredDiscipline] = useState(
    editing ? preFilledData?.disciplineList?.[0] || defaultDiscipline : defaultDiscipline
  );
  const [enteredMistakeFine, setEnteredMistakeFine] = useState(
    preFilledData?.bustVal !== undefined ? Number(preFilledData.bustVal) : 5
  );
  const [enteredSkipFine, setEnteredSkipFine] = useState(
    preFilledData?.skipVal !== undefined ? Number(preFilledData.skipVal) : 20
  );

  const [teamsList, setTeamsList] = useState([...(preFilledData?.teamsList || [])]);
  const [stageList, setStageList] = useState([...(preFilledData?.stageList || [])]);

  const [isModified, setIsModified] = useState(false);
  const [createBtnEnabled, setCreateBtnEnabled] = useState(true);
  const [tourTitleInputIsTouched, setTourTitleInputIsTouched] = useState(false);
  const [tourDisciplineIsTouched, setTourDisciplineIsTouched] = useState(false);
  const [mistakeFineInputIsTouched, setMistakeFineInputIsTouched] = useState(false);
  const [skipFineInputTouched, setSkipFineInputTouched] = useState(false);
  const [inputsValid, setInputsValid] = useState(editing === true);
  const [teamsAreValid, setTeamsAreValid] = useState(editing === true);
  const [stagesAreValid, setStagesAreValid] = useState(editing === true);
  const [isLoading, setIsLoading] = useState(false);

  const tourTitleIsValid = enteredTitle.trim() !== "";
  const tourDisciplineIsValid = enteredDiscipline?.name?.trim().length > 0;
  const tourTitleInputIsInValid = !tourTitleIsValid && tourTitleInputIsTouched;
  const tourDisciplineIsInValid = !tourDisciplineIsValid && tourDisciplineIsTouched;

  const bustValueInputIsValid =
    enteredMistakeFine !== "" &&
    Number(enteredMistakeFine) >= 0 &&
    Number(enteredMistakeFine) <= 40 &&
    reValid.test(String(enteredMistakeFine));
  const mistakeFineInputIsInValid = !bustValueInputIsValid && mistakeFineInputIsTouched;

  const skipValueIsValid =
    enteredSkipFine !== "" &&
    Number(enteredSkipFine) >= 0 &&
    Number(enteredSkipFine) <= 40 &&
    reValid.test(String(enteredSkipFine));
  const skipFineInputIsInValid = !skipValueIsValid && skipFineInputTouched;

  const normalizedTeams = useMemo(
    () => teamsList.map(normalizeTeam).filter((team) => team.name && team.number),
    [teamsList]
  );
  const normalizedStages = useMemo(
    () => stageList.map(normalizeStage).filter((stage) => stage.name),
    [stageList]
  );
  const validTeamsCount = normalizedTeams.length;
  const validStagesCount = normalizedStages.length;

  const titleChangeHandler = (event) => {
    setEnteredTitle(event.target.value);
    setIsModified(true);
    setChangesMade(true);
  };

  const disciplineChangeHandler = (event) => {
    setEnteredDiscipline((prev) => ({
      ...prev,
      name: event.target.value,
    }));
    setIsModified(true);
    setChangesMade(true);
  };

  const bustInputChangeHandler = (event) => {
    const val = event.target.value;
    if (val === "" || re.test(val)) {
      setEnteredMistakeFine(val);
      setIsModified(true);
      setChangesMade(true);
    }
  };

  const skipInputChangeHandler = (event) => {
    const val = event.target.value;
    if (val === "" || re.test(val)) {
      setEnteredSkipFine(val);
      setIsModified(true);
      setChangesMade(true);
    }
  };

  const updateTeam = (row) => {
    setTeamsList((prev) => {
      const idx = prev.findIndex((team) => team.id === row.id);
      if (idx === -1) {
        return [...prev, { ...row, isEdited: row.inDB ? true : false }];
      }
      return prev.map((team, index) =>
        index === idx ? { ...row, isEdited: row.inDB ? true : false } : team
      );
    });
    setIsModified(true);
  };

  const updateStage = (row) => {
    setStageList((prev) => {
      const idx = prev.findIndex((stage) => stage.id === row.id);
      if (idx === -1) {
        return [...prev, { ...row, isEdited: row.inDB ? true : false }];
      }
      return prev.map((stage, index) =>
        index === idx ? { ...row, isEdited: row.inDB ? true : false } : stage
      );
    });
    setIsModified(true);
  };

  const deleteTeam = (e) => {
    setTeamsList((prev) => prev.filter((item) => item.id !== e.id));
    setIsModified(true);
  };

  const deleteStage = (e) => {
    setStageList((prev) => prev.filter((stage) => stage.id !== e.id));
    setIsModified(true);
  };

  const formSubmitHandler = async (event) => {
    event.preventDefault();

    const validationErrors = [];
    if (!tourTitleIsValid) validationErrors.push("Tournament name");
    if (!tourDisciplineIsValid) validationErrors.push("Discipline name");
    if (!bustValueInputIsValid) validationErrors.push("Bust value");
    if (!skipValueIsValid) validationErrors.push("Skip value");
    if (validTeamsCount < 1) validationErrors.push("Minimum 1 participant with number");
    if (validStagesCount < 1) validationErrors.push("Minimum 1 round");

    if (validationErrors.length > 0) {
      setTourTitleInputIsTouched(true);
      setTourDisciplineIsTouched(true);
      setMistakeFineInputIsTouched(true);
      setSkipFineInputTouched(true);
      alert(`Fill required fields:\n- ${validationErrors.join("\n- ")}`);
      return;
    }

    setIsLoading(true);
    try {
      const disciplines = [
        {
          id: enteredDiscipline.id ?? makeLocalId("discipline"),
          name: enteredDiscipline.name.trim(),
        },
      ];

      const sentData = {
        id: preFilledData?.id || makeLocalId("tour"),
        name: enteredTitle.trim(),
        teams: normalizedTeams,
        disciplines,
        stages: normalizedStages,
        round: buildRounds(normalizedTeams, normalizedStages),
        bust_value: Number(enteredMistakeFine),
        skip_value: Number(enteredSkipFine),
      };

      if (props.editing) {
        await updateTournament(sentData);
      } else {
        await createTournament(sentData);
      }

      setChangesMade(false);
      if (props.onClose) {
        props.onClose();
      } else {
        props.changeCurrentMainContent("tournamentsList");
      }
    } catch (error) {
      console.log("Tournament save failed", error);
      alert(`Failed to save tournament: ${error?.message || "unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCreateBtnEnabled(Boolean(inputsValid && teamsAreValid && stagesAreValid));
  }, [inputsValid, teamsAreValid, stagesAreValid]);

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

  useEffect(() => {
    if (useInlineFooter || !setFooterActions) {
      return undefined;
    }
    setFooterActions(
      <Box component="section" className={classes.buttonRow}>
        <BackButton
          isModified={isModified}
          changeContent={props.onContentChange}
          setChangesMade={setChangesMade}
          onClose={props.onClose}
        />
        <SubmitButton
          formId={formId}
          isEnabled={createBtnEnabled}
          editing={props.editing}
        />
      </Box>
    );

    return () => setFooterActions(null);
  }, [
    createBtnEnabled,
    formId,
    isModified,
    props.editing,
    props.onContentChange,
    props.onClose,
    setChangesMade,
    setFooterActions,
    useInlineFooter,
  ]);

  return (
    <Fragment>
      <CircularProgressDialog open={isLoading} />
      <form
        id={formId}
        method="POST"
        autoComplete="off"
        onSubmit={formSubmitHandler}
        className={`${classes.customForm} ${isPageMode ? classes.pageForm : ""}`}
      >
        <section className={classes.settings}>
          <div className={classes["settings__options"]}>
            <div className={classes.tourInput}>
              <TextField
                value={enteredTitle}
                error={tourTitleInputIsInValid}
                name="title"
                required
                slotProps={{ htmlInput: { maxLength: 20 } }}
                className={classes.option}
                variant="outlined"
                label="Tournament Name"
                placeholder={!enteredTitle ? "max length - 20" : ""}
                onChange={titleChangeHandler}
                onBlur={() => setTourTitleInputIsTouched(true)}
                onFocus={() => setTourTitleInputIsTouched(false)}
              />
              <TextField
                value={enteredDiscipline.name}
                error={tourDisciplineIsInValid}
                name="discipline"
                required
                slotProps={{ htmlInput: { maxLength: 20 } }}
                className={classes.option}
                variant="outlined"
                label="Discipline Name"
                placeholder={!enteredDiscipline.name ? "max length - 20" : ""}
                onChange={disciplineChangeHandler}
                onBlur={() => setTourDisciplineIsTouched(true)}
                onFocus={() => setTourDisciplineIsTouched(false)}
              />
            </div>
            <div className={classes.faultsBlock}>
              <div className={classes.bustInput}>
                <TextField
                  error={mistakeFineInputIsInValid}
                  placeholder="0 - 40"
                  helperText={mistakeFineInputIsInValid && Number(enteredMistakeFine) > 40 && "Maximum - 40"}
                  name="mistake_value"
                  value={enteredMistakeFine}
                  required
                  className={classes.option}
                  variant="outlined"
                  label="Bust value"
                  onChange={bustInputChangeHandler}
                  onBlur={() => setMistakeFineInputIsTouched(true)}
                />
              </div>
              <div className={classes.skipInput}>
                <TextField
                  error={skipFineInputIsInValid}
                  placeholder="0 - 40"
                  helperText={skipFineInputIsInValid && Number(enteredSkipFine) > 40 && "Maximum - 40"}
                  name="skip_value"
                  required
                  className={classes.option}
                  value={enteredSkipFine}
                  variant="outlined"
                  label="Skip value"
                  onChange={skipInputChangeHandler}
                  onBlur={() => setSkipFineInputTouched(true)}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={classes["table-parameters"]}>
          <div className={classes.tableSection}>
            <h4>Teams</h4>
            <div className={classes.tableGridWrap}>
              <EditableDataGrid
                tableHeader="Teams"
                data={teamsList}
                gridHeight={
                  isPageMode
                    ? "clamp(300px, calc(100vh - 520px), 420px)"
                    : "clamp(500px, calc(100vh - 430px), 700px)"
                }
                setItemsList={setTeamsList}
                deleteItem={deleteTeam}
                updateItem={updateTeam}
                toggleRowsValid={setTeamsAreValid}
                setChangesMade={setChangesMade}
                setIsModified={setIsModified}
                pageMode={isPageMode}
              />
            </div>
          </div>
          <div className={classes.tableSection}>
            <h4>Stages</h4>
            <div className={classes.tableGridWrap}>
              <EditableDataGrid
                editing={props.editing}
                tableHeader="Stages"
                data={stageList}
                gridHeight={
                  isPageMode
                    ? "clamp(300px, calc(100vh - 520px), 420px)"
                    : "clamp(500px, calc(100vh - 430px), 700px)"
                }
                setItemsList={setStageList}
                deleteItem={deleteStage}
                updateItem={updateStage}
                toggleRowsValid={setStagesAreValid}
                setChangesMade={setChangesMade}
                setIsModified={setIsModified}
                pageMode={isPageMode}
              />
            </div>
          </div>
        </section>
        {useInlineFooter && (
          <Box component="section" className={classes.drawerFooter}>
            <BackButton
              isModified={isModified}
              changeContent={props.onContentChange}
              setChangesMade={setChangesMade}
              onClose={props.onClose}
            />
            <SubmitButton
              formId={formId}
              isEnabled={createBtnEnabled}
              editing={props.editing}
            />
          </Box>
        )}
      </form>
    </Fragment>
  );
};

export default NewTournamentForm;
