// src/pages/Home.js
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  TextField,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { startOfDay, endOfDay } from "date-fns";

import FileUpload from "../components/FileUpload";
import DepartmentFilter from "../components/DepartmentFilter";
import FilterToolbar from "../components/FilterToolbar";
import AttendanceTable from "../components/AttendanceTable";
import {
  convertExcelDateToJSDate,
  convertExcelTimeToTimeString,
} from "../utils/dateUtils";
import { printStyledAttendance } from "../utils/printUtils";

import { collection, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore";
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
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [depts, setDepts] = useState([]);
  const [dept, setDept] = useState("all");

  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [includeSaturday, setIncludeSaturday] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  // Load dữ liệu từ Firestore
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
      setDepts(Array.from(new Set(all.map((r) => r["Tên bộ phận"]))));
    } catch {
      enqueueSnackbar("Lỗi khi tải dữ liệu", { variant: "error" });
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadAttendanceData();
  }, [loadAttendanceData]);

  // Filter theo bộ phận và ngày
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

  // Xóa và upload mới toàn bộ dữ liệu chấm công
  const handleFileUploadData = useCallback(
    async (rawRows) => {
      try {
        const snap = await getDocs(collection(db, "attendance"));
        const deletePromises = snap.docs.map((d) => deleteDoc(doc(db, "attendance", d.id)));
        await Promise.all(deletePromises);

        const formatted = rawRows.map((r) => {
          const dateStr = convertExcelDateToJSDate(r["Ngày"]);
          return {
            id: `${r["Tên nhân viên"]}_${dateStr.replace(/\//g, "-")}`,
            "Tên nhân viên": r["Tên nhân viên"],
            "Tên bộ phận": r["Tên bộ phận"],
            Ngày: dateStr,
            dateObj: parseDMY(dateStr),
            S1: r.S1 != null && r.S1 !== "" ? convertExcelTimeToTimeString(r.S1) : "",
            S2: r.S2 != null && r.S2 !== "" ? convertExcelTimeToTimeString(r.S2) : "",
            C1: r.C1 != null && r.C1 !== "" ? convertExcelTimeToTimeString(r.C1) : "",
            C2: r.C2 != null && r.C2 !== "" ? convertExcelTimeToTimeString(r.C2) : "",
            morning: "",
            afternoon: "",
          };
        });

        await Promise.all(
          formatted.map((row) =>
            setDoc(doc(db, "attendance", row.id), row)
          )
        );

        enqueueSnackbar("Tải & lưu cloud thành công", { variant: "success" });
        await loadAttendanceData();
      } catch (err) {
        enqueueSnackbar("Lỗi khi tải file", { variant: "error" });
      }
    },
    [enqueueSnackbar, loadAttendanceData]
  );

  // Lưu lý do trễ
  const handleReasonSave = useCallback(async (rowId, field, value) => {
    try {
      await setDoc(doc(db, "lateReasons", rowId), { [field]: value }, { merge: true });
      enqueueSnackbar("Đã lưu lý do", { variant: "success" });
      await loadAttendanceData(); // Reload nếu muốn realtime lý do
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
    printStyledAttendance(
      filtered,
      dept === "all" ? "Tất cả" : dept,
      fromDate,
      toDate,
      includeSaturday
    );
  };

  if (!rows.length) {
    return <CircularProgress sx={{ display: "block", mx: "auto", my: 4 }} />;
  }

  return (
    <>
      <Box mb={2}>
        <FileUpload onFileUpload={handleFileUpload} />
      </Box>
      <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
        <DepartmentFilter
          depts={depts}
          value={dept}
          onChange={setDept}
          labels={{ all: "Tất cả" }}
        />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Từ ngày"
            value={fromDate}
            onChange={setFromDate}
            renderInput={(params) => <TextField size="small" {...params} />}
          />
          <DatePicker
            label="Đến ngày"
            value={toDate}
            onChange={setToDate}
            renderInput={(params) => <TextField size="small" {...params} />}
          />
        </LocalizationProvider>
      </Box>
      <Box mb={2}>
        <FilterToolbar
          onSearchChange={(kw) => {
            const k = kw.trim().toLowerCase();
            if (!k) return setFiltered(rows);
            setFiltered(
              rows.filter((r) =>
                Object.values(r).some((v) =>
                  v?.toString().toLowerCase().includes(k)
                )
              )
            );
          }}
        />
      </Box>
      <Box mb={2}>
        <FormControlLabel
          control={
            <Checkbox
              checked={includeSaturday}
              onChange={(e) => setIncludeSaturday(e.target.checked)}
            />
          }
          label="In thêm ngày Thứ 7"
        />
      </Box>
      <Box mb={2}>
        <Button fullWidth variant="contained" onClick={handlePrint}>
          IN BẢNG CHẤM CÔNG
        </Button>
      </Box>
      <AttendanceTable
        rows={filtered}
        includeSaturday={includeSaturday}
        onReasonSave={handleReasonSave}
      />
    </>
  );
}
