import React, { useState, useEffect, useCallback } from "react";
import { Box, Button, TextField } from "@mui/material";
import FileUpload from "../components/FileUpload";
import MonthFilter from "../components/MonthFilter";
import DepartmentFilter from "../components/DepartmentFilter";
import FilterToolbar from "../components/FilterToolbar";
import PrintButton from "../components/PrintButton";
import AttendanceTable from "../components/AttendanceTable";
import {
  convertExcelDateToJSDate,
  convertExcelTimeToTimeString,
} from "../utils/dateUtils";
import { printStyledAttendance } from "../utils/printUtils";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useSnackbar } from "notistack";

const toDateString = (val) => {
  if (typeof val === "string") return val;
  const d = val.toDate ? val.toDate() : val;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getMonthKey = (dateStr) => dateStr.slice(3);

export default function Home() {
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [months, setMonths] = useState([]);
  const [depts, setDepts] = useState([]);
  const [month, setMonth] = useState("all");
  const [dept, setDept] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { enqueueSnackbar } = useSnackbar();

  // 1) Load attendance + lý do
  useEffect(() => {
    (async () => {
      try {
        const attSnap = await getDocs(collection(db, "attendance"));
        const lateSnap = await getDocs(collection(db, "lateReasons"));
        const lateMap = {};
        lateSnap.forEach(d => lateMap[d.id] = d.data());

        const all = attSnap.docs.map(d => {
          const data = d.data();
          const dateStr = toDateString(data.Ngày);
          return {
            id: d.id,
            ...data,
            Ngày: dateStr,
            monthKey: getMonthKey(dateStr),
            morning: lateMap[d.id]?.morning || "",
            afternoon: lateMap[d.id]?.afternoon || "",
            S1: data.S1 || "",
            S2: data.S2 || "",
            C1: data.C1 || "",
            C2: data.C2 || "",
          };
        });
        setRows(all);
        setMonths(Array.from(new Set(all.map(r => r.monthKey))));
        setDepts(Array.from(new Set(all.map(r => r["Tên bộ phận"]))));
      } catch {
        enqueueSnackbar("Lỗi khi tải dữ liệu", { variant: "error" });
      }
    })();
  }, [enqueueSnackbar]);

  // 2) Filter month/dept whenever thay đổi
  useEffect(() => {
    let tmp = rows;
    if (month !== "all") tmp = tmp.filter(r => r.monthKey === month);
    if (dept !== "all") tmp = tmp.filter(r => r["Tên bộ phận"] === dept);
    setFiltered(tmp);
  }, [rows, month, dept]);

  // 3) Upload Excel
  const handleFileUpload = useCallback(async rawRows => {
    try {
      const formatted = rawRows.map(r => {
        const dateStr = convertExcelDateToJSDate(r["Ngày"]);
        return {
          id: `${r["Tên nhân viên"]}_${dateStr.replace(/\//g,"-")}`,
          "Tên nhân viên": r["Tên nhân viên"],
          "Tên bộ phận": r["Tên bộ phận"],
          Ngày: dateStr,
          monthKey: getMonthKey(dateStr),
          S1: convertExcelTimeToTimeString(r.S1),
          S2: convertExcelTimeToTimeString(r.S2),
          C1: convertExcelTimeToTimeString(r.C1),
          C2: convertExcelTimeToTimeString(r.C2),
          morning: "",
          afternoon: "",
        };
      });
      await Promise.all(
        formatted.map(row =>
          setDoc(doc(db, "attendance", row.id), row, { merge: true })
        )
      );
      enqueueSnackbar("Tải & lưu cloud thành công", { variant: "success" });
      // gộp rows mới vào state
      setRows(prev => {
        const other = prev.filter(r => r.monthKey !== formatted[0].monthKey);
        return [...other, ...formatted];
      });
    } catch {
      enqueueSnackbar("Lỗi khi tải file", { variant: "error" });
    }
  }, [enqueueSnackbar]);

  // 4) In theo filter tháng/bộ phận
  const handlePrint = () => {
    if (!filtered.length) {
      enqueueSnackbar("Chưa có dữ liệu để in", { variant: "warning" });
      return;
    }
    printStyledAttendance(filtered, dept === "all" ? "Tất cả" : dept);
  };

  // 5) In theo lịch “Từ ngày – Đến ngày”
  const handlePrintRange = () => {
    if (!fromDate || !toDate) {
      enqueueSnackbar("Chưa chọn đủ Từ ngày / Đến ngày", { variant: "warning" });
      return;
    }
    const a = new Date(fromDate), b = new Date(toDate);
    const inRange = rows.filter(r => {
      const [dd, mm, yyyy] = r.Ngày.split("/").map(Number);
      const d = new Date(yyyy, mm-1, dd);
      return d >= a && d <= b;
    });
    if (!inRange.length) {
      enqueueSnackbar("Không có bản ghi trong khoảng này", { variant: "warning" });
      return;
    }
    printStyledAttendance(inRange, dept === "all" ? "Tất cả" : dept);
  };

  return (
    <>
      <FileUpload onFileUpload={handleFileUpload} />

      <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
        <MonthFilter months={months} value={month} onChange={setMonth} labels={{ all: "Tất cả" }}/>
        <DepartmentFilter depts={depts} value={dept} onChange={setDept} labels={{ all: "Tất cả" }}/>
      </Box>

      <FilterToolbar onSearchChange={kw => {
        const k = kw.toLowerCase();
        if (!k) return setFiltered(rows);
        setFiltered(rows.filter(r =>
          Object.values(r).some(v =>
            v && v.toString().toLowerCase().includes(k)
          )
        ));
      }}/>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          label="Từ ngày"
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Đến ngày"
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" color="secondary" onClick={handlePrintRange}>
          In theo lịch
        </Button>
      </Box>

      <PrintButton onPrint={handlePrint} />

      <AttendanceTable rows={filtered} onReasonSave={() => {}} />
    </>
  );
}
