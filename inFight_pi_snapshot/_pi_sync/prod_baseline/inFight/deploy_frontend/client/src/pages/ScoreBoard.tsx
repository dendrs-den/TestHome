import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import React, { Fragment } from "react";
import { Helmet } from "react-helmet";
import classes from "./ScoreBoard.module.scss";
import { useNavigate } from "react-router-dom";

type ApiData = {
  tourName: string;
  teams: Array<Team>;
};

type Team = {
  id: string;
  number: number;
  name: string;
  rounds: Array<Round>;
  total: {
    time: string;
    rank: number;
  };
};

type Round = {
  name: string;
  time: string;
  rank: number;
};

const receivedData: ApiData = {
  tourName: "Flow CUP 2022 Solo Speed",
  teams: [
    {
      id: "id_string",
      number: 4,
      name: "Team_name1",
      rounds: [
        {
          name: "round999",
          time: "12:20",
          rank: 1,
        },
        {
          name: "round2",
          time: "10:20",
          rank: 3,
        },
        {
          name: "round3",
          time: "13:20",
          rank: 2,
        },
      ],
      total: {
        time: "13:20",
        rank: 6,
      },
    },
    {
      id: "id_string",
      number: 6,
      name: "Team_name2",
      rounds: [
        {
          name: "round1",
          time: "14:20",
          rank: 4,
        },
        {
          name: "round2",
          time: "15:20",
          rank: 6,
        },
        {
          name: "round3",
          time: "16:20",
          rank: 5,
        },
      ],
      total: {
        time: "13:20",
        rank: 6,
      },
    },
    {
      id: "id_string",
      number: 999,
      name: "Team_name3",
      rounds: [
        {
          name: "round1",
          time: "17:20",
          rank: 6,
        },
        {
          name: "round2",
          time: "18:20",
          rank: 3,
        },
        {
          name: "round3",
          time: "19:20",
          rank: 2,
        },
      ],
      total: {
        time: "13:20",
        rank: 6,
      },
    },
  ],
};

function createRow({ number, name, rounds, total: { time, rank } }: Team) {
  const spreadRoundData = rounds
    .reduce((allProps: Array<unknown>, round: Round) => {
      return [...allProps, ...Object.values(round)];
    }, [])
    .filter((prop, i) => i % 3 !== 0);

  return [name, number, ...spreadRoundData, time, rank];
}

const createdRows = receivedData.teams.map((team) => createRow(team));
// console.log(createdRows);

const ScoreBoard = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const storedUser = sessionStorage.getItem("user");

    if (!storedUser) {
      navigate("/login");
    }
  }, []);


  return (
    <Fragment>
      <Helmet>
        <title>InFlight scoreboard</title>
      </Helmet>
      <Box className={classes.center}>
        <Box alignSelf="start" marginBottom="15px">
          {receivedData.tourName}
        </Box>
        <TableContainer component={Paper}>
          <Table
            sx={{
              minWidth: 1200,
              border: "1px solid #B0ACAC",
              "& td, & th": {
                borderBottom: "1px solid #B0ACAC",
              },
            }}
            aria-label="simple table"
          >
            <TableHead>
              <TableRow>
                <TableCell colSpan={3}></TableCell>

                {receivedData.teams[0].rounds.map((round: Round) => (
                  <TableCell
                    key={round.name}
                    sx={{
                      border: "1px solid #B0ACAC",
                    }}
                    id={round.name}
                    align={"center"}
                    colSpan={2}
                  >
                    {round.name}
                  </TableCell>
                ))}
                <TableCell
                  sx={{
                    border: "1px solid #B0ACAC",
                    backgroundColor: "rgba(86, 44, 255, 0.1)",
                  }}
                  colSpan={2}
                  align={"center"}
                >
                  Total
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell
                  colSpan={1}
                  sx={{
                    position: "relative",
                    "&:after": {
                      content: "''",
                      width: "1px",
                      backgroundColor: "#B0ACAC",
                      height: "13px",
                      position: "absolute",
                      right: "0px",
                      top: "22px",
                    },
                  }}
                >
                  #
                </TableCell>
                <TableCell
                  colSpan={1}
                  sx={{
                    position: "relative",
                    "&:after": {
                      content: "''",
                      width: "1px",
                      backgroundColor: "#B0ACAC",
                      height: "13px",
                      position: "absolute",
                      right: "0px",
                      top: "22px",
                    },
                  }}
                >
                  name
                </TableCell>
                <TableCell
                  colSpan={1}
                  sx={{ borderRight: "1px solid #B0ACAC" }}
                >
                  number
                </TableCell>

                {receivedData.teams[0].rounds.map(({ name }: Round) => (
                  <React.Fragment key={name}>
                    <TableCell
                      align="center"
                      sx={{
                        position: "relative",
                        "&:after": {
                          content: "''",
                          width: "1px",
                          backgroundColor: "#B0ACAC",
                          height: "13px",
                          position: "absolute",
                          right: "0px",
                          top: "22px",
                        },
                      }}
                      colSpan={1}
                    >
                      time
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{ borderRight: "1px solid #B0ACAC" }}
                      colSpan={1}
                    >
                      rank
                    </TableCell>
                  </React.Fragment>
                ))}
                {/* Total */}
                <TableCell
                  align="center"
                  colSpan={1}
                  sx={{
                    backgroundColor: "rgba(86, 44, 255, 0.1)",
                    position: "relative",
                    "&:after": {
                      content: "''",
                      width: "1px",
                      backgroundColor: "#B0ACAC",
                      height: "13px",
                      position: "absolute",
                      right: "0px",
                      top: "22px",
                    },
                  }}
                >
                  time
                </TableCell>
                <TableCell
                  align="center"
                  colSpan={1}
                  sx={{
                    backgroundColor: "rgba(86, 44, 255, 0.1)",
                  }}
                >
                  rank
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {createdRows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  {row.map((item, j) => (
                    <TableCell
                      align={![0, 1].includes(j) ? "center" : "left"}
                      sx={{
                        color: j % 2 === 0 && j !== 0 ? "#B0ACAC" : "black",
                        borderRight: j === 1 ? "1px solid #B0ACAC" : "none",
                        backgroundColor: [8, 9].includes(j)
                          ? "rgba(86, 44, 255, 0.1);"
                          : "none",
                      }}
                    >
                      {item}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Fragment>
  );
};

export default ScoreBoard;
