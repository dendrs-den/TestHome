import React from "react";
import { Box, Input, Button, Container, Stack, Typography, FormLabel, Loader } from "@mui/material";

import { useNavigate } from "react-router-dom";

const LoginPage = ({ setUser }) => {
  const [login, setLogin] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  // eslint-disable-next-line no-undef
  const loginInfo = process.env.REACT_APP_LOGIN || "test";
  // eslint-disable-next-line no-undef
  const passwordInfo = process.env.REACT_APP_PASSWORD || "test";

  let navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "login") {
      setLogin(value);
    } else {
      setPassword(value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);

    if (!(login && password)) {
      return;
    }

    setLoading(true);

    if (login === loginInfo && password === passwordInfo) {
      sessionStorage.setItem("user", JSON.stringify({ login, password }));
      const storedUser = sessionStorage.getItem("user");
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      const fallback = sessionStorage.getItem("fallback");
      navigate(fallback && fallback !== "/login" ? fallback : "/terminal");
    } else {
      setError("Username or password is incorrect");
      setLoading(false);
    }
  };
  return (
    <Container fixed>
      <Stack justifyContent={"center"} alignItems={"center"} height={"100vh"} spacing={3}>
        <Typography variant="h4" fontWeight={"bold"}>
          Login
        </Typography>
        <form name="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <Stack spacing={1}>
              <FormLabel htmlFor="login">Login</FormLabel>
              <Input
                placeholder="Enter login"
                id="login"
                type="text"
                name="login"
                value={login}
                onChange={handleChange}
              />
              {submitted && !loginInfo && <Box className="help-block">login is required</Box>}
            </Stack>
            <Stack spacing={1}>
              <FormLabel htmlFor="password">Password</FormLabel>
              <Input
                placeholder="Enter Password"
                id="password"
                type="password"
                name="password"
                value={password}
                onChange={handleChange}
              />
              {submitted && !password && <Box className="help-block">Password is required</Box>}
            </Stack>
            <Stack spacing={1}>
              <Button variant="contained" type="submit" disabled={loading}>
                Login
              </Button>
              {loading && (
                <Typography variant="p" fontWeight={"bold"}>
                  Loading ...
                </Typography>
              )}
              {error && <Box>{error}</Box>}
            </Stack>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
};

export { LoginPage };
