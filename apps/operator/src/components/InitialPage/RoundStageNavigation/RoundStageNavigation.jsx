import classes from "./RoundStageNavigation.module.css";

const RoundStageNavigation = ({ stages = [], activeStageId, onSelectStage }) => {
  return (
    <div className={classes.navigationBlock}>
      <div className={classes.scrollArea}>
        <div className={classes.navBlock}>
          {stages.map((stage, index) => {
            const isSelected = stage?.id === activeStageId;

            return (
              <button
                key={stage?.id || index}
                type="button"
                className={`${classes.navBtn} ${
                  isSelected ? classes.navBtn_selected : ""
                }`.trim()}
                onClick={() => onSelectStage?.(stage?.id)}
              >
                {stage?.name || `Stage ${index + 1}`}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoundStageNavigation;
