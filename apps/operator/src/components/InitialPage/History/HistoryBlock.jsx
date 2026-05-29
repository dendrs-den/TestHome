import { Box, Typography } from "@mui/material";
import "./HistoryBlock.css";

const HistoryBlock = () => {
  return (
    <Box className="history__container">
      <Box
        sx={{
          minHeight: "320px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          color: "#dbe3ff",
          textAlign: "center",
          padding: "24px",
          border: "1px solid #2b3551",
          backgroundColor: "#050b1a",
          borderRadius: "8px",
        }}
      >
        <Typography fontSize="24px" fontWeight={700}>
          History временно недоступен
        </Typography>
        <Typography maxWidth="620px" color="#8e9ab8" lineHeight={1.6}>
          Текущий LAN-runtime оператора переведён на живой контур турниров и
          управления раундами через Raspberry `core`. Экран истории будет
          возвращён отдельным проходом уже на едином backend-контракте.
        </Typography>
      </Box>
    </Box>
  );
};

export default HistoryBlock;
