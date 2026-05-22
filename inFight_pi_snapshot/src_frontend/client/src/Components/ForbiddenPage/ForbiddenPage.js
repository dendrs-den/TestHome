import classes from "./ForbiddenPage.module.css";
const ForbiddenPage = () => {
  return (
    <div className={classes.container}>
      <p>
        Данная страница уже где-то запущена, допускается одновременная работа только в рамках одного клиента. В случае
        проблем перезагрузите систему!{" "}
      </p>
    </div>
  );
};

export default ForbiddenPage;
