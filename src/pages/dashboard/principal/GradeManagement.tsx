import { useState } from "react";
import { useRegistrationData } from "@/hooks/useRegistrationData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { GraduationCap, Plus, Users, School, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function GradeManagement() {
    const { grades, students, registerClasses, subjectClasses } = useRegistrationData();

    // In this implementation, grades 8-12 are usually standard, 
    // but we can show stats and allow adding custom tiers if needed.

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-4xl font-black tracking-tight">Grade Management</h1>
                <p className="text-muted-foreground">Monitor enrollment and class distribution across grade levels.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {grades.map((grade) => {
                    const gradeStudents = students.filter(s => s.gradeId === grade.id);
                    const gradeRegClasses = registerClasses.filter(rc => rc.gradeId === grade.id);
                    const gradeSubClasses = subjectClasses.filter(sc => sc.gradeId === grade.id);

                    return (
                        <Card key={grade.id} className="relative overflow-hidden group border-2">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <GraduationCap className="h-24 w-24" />
                            </div>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-3xl font-black">{grade.name}</CardTitle>
                                        <Badge variant="secondary" className="mt-1">Level {grade.level}</Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="p-3 rounded-xl bg-primary/5 text-center">
                                        <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
                                        <div className="text-xl font-bold">{gradeStudents.length}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase font-black">Learners</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-blue-500/5 text-center">
                                        <School className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                                        <div className="text-xl font-bold">{gradeRegClasses.length}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase font-black">Reg Classes</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-purple-500/5 text-center">
                                        <BookOpen className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                                        <div className="text-xl font-bold">{gradeSubClasses.length}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase font-black">Sub Classes</div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-bold">Total Capacity</span>
                                        <span className="text-muted-foreground">
                                            {gradeRegClasses.reduce((acc, curr) => acc + curr.maxStudents, 0)} Seats
                                        </span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full"
                                            style={{
                                                width: `${Math.min((gradeStudents.length / (gradeRegClasses.reduce((acc, curr) => acc + curr.maxStudents, 0) || 1)) * 100, 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Grade Distribution Summary</CardTitle>
                </CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="font-bold">Grade Level</TableHead>
                            <TableHead className="font-bold">Total Enrollment</TableHead>
                            <TableHead className="font-bold">Male</TableHead>
                            <TableHead className="font-bold">Female</TableHead>
                            <TableHead className="font-bold">Avg. Class Size</TableHead>
                            <TableHead className="text-right font-bold">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {grades.map((grade) => {
                            const gradeStudents = students.filter(s => s.gradeId === grade.id);
                            const maleCount = gradeStudents.filter(s => s.gender === "Male").length;
                            const femaleCount = gradeStudents.filter(s => s.gender === "Female").length;
                            const regClassCount = registerClasses.filter(rc => rc.gradeId === grade.id).length;
                            const avgSize = regClassCount > 0 ? (gradeStudents.length / regClassCount).toFixed(1) : "0";

                            return (
                                <TableRow key={grade.id}>
                                    <TableCell className="font-bold">{grade.name}</TableCell>
                                    <TableCell>{gradeStudents.length} Students</TableCell>
                                    <TableCell>{maleCount}</TableCell>
                                    <TableCell>{femaleCount}</TableCell>
                                    <TableCell>{avgSize} students/class</TableCell>
                                    <TableCell className="text-right">
                                        <Badge className={gradeStudents.length > 0 ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}>
                                            {gradeStudents.length > 0 ? "Active" : "Stable"}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
