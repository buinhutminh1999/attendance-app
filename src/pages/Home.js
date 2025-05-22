// src/pages/Home.js
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  useMediaQuery,
  Typography,
  Paper,
  Grid,
  Divider,
  Stack,
  Tooltip,
} from "@mui/material";
import { LocalizationProvider, DatePicker, MobileDatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { startOfDay, endOfDay } from "date-fns";
import { Print, UploadFile } from "@mui/icons-material";

import FileUpload from "../components/FileUpload";
import DepartmentFilter from "../components/DepartmentFilter";
import FilterToolbar from "../components/FilterToolbar";
import AttendanceTable from "../components/AttendanceTable";
import {
  convertExcelDateToJSDate,
  convertExcelTimeToTimeString,
} from "../utils/dateUtils";
import { printStyledAttendance } from "../utils/printUtils";

import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useSnackbar } from "notistack";
import { useFileUpload } from "../hooks/useFileUpload";

const toDateString = (val) => {
  if (typeof val === "string") return val;
  const d = val.toDate ? val.toDate() : val;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const parseDMY = (s) => {
  const [dd, mm, yyyy] = s.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
};

export default function Home() {
  const isMobile = useMediaQuery("(max-width:600px)");
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [depts, setDepts] = useState([]);
  const [dept, setDept] = useState("all");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [includeSaturday, setIncludeSaturday] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const Picker = isMobile ? MobileDatePicker : DatePicker;

  const loadAttendanceData = useCallback(async () => {
    try {
      const attSnap = await getDocs(collection(db, "attendance"));
      const lateSnap = await getDocs(collection(db, "lateReasons"));
      const lateMap = {};
      lateSnap.forEach((d) => (lateMap[d.id] = d.data()));

      const all = attSnap.docs.map((d) => {
        const data = d.data();
        const dateStr = toDateString(data.Ngày);
        const dateObj = parseDMY(dateStr);
        return {
          id: d.id,
          ...data,
          Ngày: dateStr,
          dateObj,
          S1: data.S1 || "",
          S2: data.S2 && data.S2 !== data.S1 ? data.S2 : "",
          C1: data.C1 || "",
          C2: data.C2 || "",
          morning: lateMap[d.id]?.morning || "",
          afternoon: lateMap[d.id]?.afternoon || "",
        };
      });

      setRows(all);
      setDepts(Array.from(new Set(all.map((r) => r["Tên bộ phận"]))))
    } catch {
      enqueueSnackbar("Lỗi khi tải dữ liệu", { variant: "error" });
    }
  }, [enqueueSnackbar]);

  useEffect(() => { loadAttendanceData(); }, [loadAttendanceData]);

  useEffect(() => {
    let tmp = rows;
    if (dept !== "all") {
      tmp = tmp.filter((r) => r["Tên bộ phận"] === dept);
    }
    if (fromDate && toDate) {
      const start = startOfDay(fromDate);
      const end = endOfDay(toDate);
      tmp = tmp.filter((r) => r.dateObj >= start && r.dateObj <= end);
    }
    setFiltered(tmp);
  }, [rows, dept, fromDate, toDate]);

  const handleFileUploadData = useCallback(async (rawRows) => {
    try {
      const formatted = rawRows.map((r) => {
        const dateStr = convertExcelDateToJSDate(r["Ngày"]);
        return {
          id: `${r["Tên nhân viên"]}_${dateStr.replace(/\//g, "-")}`,
          "Tên nhân viên": r["Tên nhân viên"],
          "Tên bộ phận": r["Tên bộ phận"],
          Ngày: dateStr,
          dateObj: parseDMY(dateStr),
          S1: r.S1 ? convertExcelTimeToTimeString(r.S1) : "",
          S2: r.S2 ? convertExcelTimeToTimeString(r.S2) : "",
          C1: r.C1 ? convertExcelTimeToTimeString(r.C1) : "",
          C2: r.C2 ? convertExcelTimeToTimeString(r.C2) : "",
          morning: "",
          afternoon: "",
        };
      });
      await Promise.all(
        formatted.map((row) => setDoc(doc(db, "attendance", row.id), row, { merge: true }))
      );
      enqueueSnackbar("Tải & lưu cloud thành công", { variant: "success" });
      await loadAttendanceData();
    } catch (err) {
      enqueueSnackbar("Lỗi khi tải file", { variant: "error" });
    }
  }, [enqueueSnackbar, loadAttendanceData]);

  const handleReasonSave = useCallback(async (rowId, field, value) => {
    try {
      await setDoc(doc(db, "lateReasons", rowId), { [field]: value }, { merge: true });
      enqueueSnackbar("Đã lưu lý do", { variant: "success" });
      await loadAttendanceData();
    } catch {
      enqueueSnackbar("Lỗi khi lưu lý do", { variant: "error" });
    }
  }, [enqueueSnackbar, loadAttendanceData]);

  const { handleFileUpload } = useFileUpload(handleFileUploadData);

  const handlePrint = () => {
    if (!fromDate || !toDate) {
      enqueueSnackbar("Chọn đủ Từ ngày và Đến ngày để in", { variant: "warning" });
      return;
    }
    printStyledAttendance(filtered, dept === "all" ? "Tất cả" : dept, fromDate, toDate, includeSaturday);
  };

  if (!rows.length) return (
    <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <CircularProgress />
      <Typography sx={{ ml: 2 }}>Đang tải dữ liệu...</Typography>
    </Box>
  );

  return (
    <Box sx={{ px: isMobile ? 1 : 4, pb: 4 }}>
      <Paper elevation={3} sx={{ p: isMobile ? 2 : 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} flexWrap="wrap">
          <Typography variant="h6" fontWeight="bold">Tải file chấm công</Typography>
          <Tooltip title="Tải từ Excel">
      
          </Tooltip>
        </Stack>
        <Box mt={2}>
          <FileUpload onFileUpload={handleFileUpload} />
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: isMobile ? 2 : 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <DepartmentFilter depts={depts} value={dept} onChange={setDept} labels={{ all: "Tất cả" }} />
          </Grid>
          <Grid item xs={6} sm={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Picker label="Từ ngày" value={fromDate} onChange={setFromDate} renderInput={(params) => <TextField size="small" fullWidth {...params} />} />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={6} sm={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Picker label="Đến ngày" value={toDate} onChange={setToDate} renderInput={(params) => <TextField size="small" fullWidth {...params} />} />
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={3} sx={{ p: isMobile ? 2 : 3, mb: 3 }}>
        <FilterToolbar
          onSearchChange={(kw) => {
            const k = kw.trim().toLowerCase();
            if (!k) return setFiltered(rows);
            setFiltered(
              rows.filter((r) => Object.values(r).some((v) => v?.toString().toLowerCase().includes(k)))
            );
          }}
          placeholder="Tìm theo tên, bộ phận, ngày..."
        />
        <FormControlLabel
          sx={{ mt: 2 }}
          control={<Checkbox checked={includeSaturday} onChange={(e) => setIncludeSaturday(e.target.checked)} />}
          label="In thêm ngày Thứ 7"
        />
        <Divider sx={{ my: 2 }} />
        <Button fullWidth variant="contained" startIcon={<Print />} onClick={handlePrint}>
          IN BẢNG CHẤM CÔNG
        </Button>
      </Paper>

      <AttendanceTable
        rows={filtered}
        includeSaturday={includeSaturday}
        onReasonSave={handleReasonSave}
        isMobile={isMobile}
      />
    </Box>
  );
}