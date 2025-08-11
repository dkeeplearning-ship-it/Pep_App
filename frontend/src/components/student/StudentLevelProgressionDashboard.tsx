import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Target, 
  Calendar, 
  TrendingUp, 
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  Award,
  BookOpen
} from 'lucide-react';
import { LevelProgressionDashboard } from '../LevelProgressionDashboard';
import { levelProgressionAPI } from '@/lib/api';

interface StudentProgressionData {
  current_level: number;
  level_name: string;
  eligibility_status: string;
  attendance_percentage: number;
  attendance_threshold: number;
  quadrant_clearance: {
    persona: boolean;
    wellness: boolean;
    behavior: boolean;
    discipline: boolean;
  };
  next_level_requirements: {
    attendance_required: number;
    quadrant_thresholds: Record<string, number>;
  };
  progression_history: Array<{
    level: number;
    completed_date: string;
    status: string;
  }>;
  can_progress: boolean;
}

interface StudentRankings {
  overall_ranking: {
    rank_position: number;
    total_students: number;
    score: number;
    grade: string;
  };
  quadrant_rankings: Record<string, {
    rank_position: number;
    total_students: number;
    score: number;
  }>;
}

interface Props {
  studentId: string;
  termId: string;
}

const StudentLevelProgressionDashboard: React.FC<Props> = ({ studentId, termId }) => {
  const [progressionData, setProgressionData] = useState<StudentProgressionData | null>(null);
  const [rankings, setRankings] = useState<StudentRankings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [studentId, termId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [progressionResponse, rankingsResponse] = await Promise.all([
        levelProgressionAPI.getStudentLevelProgression(studentId, termId),
        levelProgressionAPI.getStudentRankings(studentId, termId)
      ]);
      
      setProgressionData(progressionResponse.data);
      setRankings(rankingsResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getEligibilityStatusColor = (status: string) => {
    switch (status) {
      case 'eligible': return 'bg-green-100 text-green-800 border-green-200';
      case 'ict': return 'bg-red-100 text-red-800 border-red-200';
      case 'not_cleared': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getQuadrantIcon = (quadrant: string) => {
    switch (quadrant.toLowerCase()) {
      case 'persona': return <BookOpen className="w-4 h-4" />;
      case 'wellness': return <Target className="w-4 h-4" />;
      case 'behavior': return <Users className="w-4 h-4" />;
      case 'discipline': return <Award className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getRankingColor = (position: number, total: number) => {
    const percentile = (position / total) * 100;
    if (percentile <= 10) return 'text-yellow-600'; // Top 10%
    if (percentile <= 25) return 'text-green-600'; // Top 25%
    if (percentile <= 50) return 'text-blue-600'; // Top 50%
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!progressionData || !rankings) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No progression data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Level Progression</h1>
          <p className="text-gray-600 mt-1">Track your academic journey and achievements</p>
        </div>
        <Badge className={getEligibilityStatusColor(progressionData.eligibility_status)}>
          {progressionData.eligibility_status === 'eligible' && <CheckCircle className="w-4 h-4 mr-1" />}
          {progressionData.eligibility_status === 'ict' && <AlertTriangle className="w-4 h-4 mr-1" />}
          {progressionData.eligibility_status === 'not_cleared' && <Clock className="w-4 h-4 mr-1" />}
          {progressionData.eligibility_status.toUpperCase()}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progression">Level Details</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Current Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Trophy className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">Level {progressionData.current_level}</div>
                    <div className="text-sm text-gray-600">Current Level</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {progressionData.attendance_percentage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Attendance</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      #{rankings.overall_ranking.rank_position}
                    </div>
                    <div className="text-sm text-gray-600">Overall Rank</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Award className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {rankings.overall_ranking.grade}
                    </div>
                    <div className="text-sm text-gray-600">Current Grade</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Level Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Level Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{progressionData.level_name}</span>
                  <span className="text-sm text-gray-600">
                    {progressionData.can_progress ? 'Ready for Next Level' : 'Requirements Pending'}
                  </span>
                </div>
                <Progress 
                  value={progressionData.can_progress ? 100 : 75} 
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Level {progressionData.current_level}</span>
                  <span>Level {progressionData.current_level + 1}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quadrant Clearance */}
          <Card>
            <CardHeader>
              <CardTitle>Quadrant Clearance Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(progressionData.quadrant_clearance).map(([quadrant, cleared]) => (
                  <div key={quadrant} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className={`p-2 rounded-lg ${cleared ? 'bg-green-100' : 'bg-red-100'}`}>
                      {getQuadrantIcon(quadrant)}
                    </div>
                    <div>
                      <div className="font-medium capitalize">{quadrant}</div>
                      <div className={`text-sm ${cleared ? 'text-green-600' : 'text-red-600'}`}>
                        {cleared ? 'Cleared' : 'Pending'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Status */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Attendance</span>
                  <span className={`text-sm font-medium ${
                    progressionData.attendance_percentage >= progressionData.attendance_threshold 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {progressionData.attendance_percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={progressionData.attendance_percentage} 
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span className="text-red-600">
                    Required: {progressionData.attendance_threshold}%
                  </span>
                  <span>100%</span>
                </div>
                
                {progressionData.attendance_percentage < progressionData.attendance_threshold && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Your attendance is below the required threshold of {progressionData.attendance_threshold}%. 
                      This may affect your eligibility for progression.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progression" className="space-y-6">
          <LevelProgressionDashboard 
            studentId={studentId} 
            termId={termId} 
            userRole="student" 
          />
        </TabsContent>

        <TabsContent value="rankings" className="space-y-6">
          {/* Overall Ranking */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Class Ranking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="text-6xl font-bold text-blue-600">
                  #{rankings.overall_ranking.rank_position}
                </div>
                <div className="text-lg text-gray-600">
                  out of {rankings.overall_ranking.total_students} students
                </div>
                <div className="text-sm text-gray-500">
                  Score: {rankings.overall_ranking.score.toFixed(1)}% • Grade: {rankings.overall_ranking.grade}
                </div>
                <div className={`text-lg font-medium ${getRankingColor(
                  rankings.overall_ranking.rank_position, 
                  rankings.overall_ranking.total_students
                )}`}>
                  {rankings.overall_ranking.rank_position <= rankings.overall_ranking.total_students * 0.1 
                    ? 'Top 10% 🏆' 
                    : rankings.overall_ranking.rank_position <= rankings.overall_ranking.total_students * 0.25 
                    ? 'Top 25% 🥈' 
                    : rankings.overall_ranking.rank_position <= rankings.overall_ranking.total_students * 0.5 
                    ? 'Top 50% 🥉' 
                    : 'Keep improving! 💪'
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quadrant Rankings */}
          <Card>
            <CardHeader>
              <CardTitle>Quadrant-wise Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(rankings.quadrant_rankings).map(([quadrant, ranking]) => (
                  <div key={quadrant} className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {getQuadrantIcon(quadrant)}
                      </div>
                      <div>
                        <h4 className="font-medium capitalize">{quadrant}</h4>
                        <p className="text-sm text-gray-600">Quadrant Ranking</p>
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <div className="text-3xl font-bold text-blue-600">
                        #{ranking.rank_position}
                      </div>
                      <div className="text-sm text-gray-600">
                        out of {ranking.total_students} students
                      </div>
                      <div className="text-sm text-gray-500">
                        Score: {ranking.score.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          {/* Next Level Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Next Level Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Attendance Requirement */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Attendance Requirement</span>
                  </h4>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>Minimum Attendance</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{progressionData.next_level_requirements.attendance_required}%</span>
                      {progressionData.attendance_percentage >= progressionData.next_level_requirements.attendance_required ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Quadrant Requirements */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center space-x-2">
                    <Target className="w-4 h-4" />
                    <span>Quadrant Score Requirements</span>
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(progressionData.next_level_requirements.quadrant_thresholds).map(([quadrant, threshold]) => (
                      <div key={quadrant} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          {getQuadrantIcon(quadrant)}
                          <span className="capitalize">{quadrant}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">≥ {threshold}%</span>
                          {progressionData.quadrant_clearance[quadrant as keyof typeof progressionData.quadrant_clearance] ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progression Status */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Progression Status</span>
                    <Badge className={progressionData.can_progress 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }>
                      {progressionData.can_progress ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Ready to Progress
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 mr-1" />
                          Requirements Pending
                        </>
                      )}
                    </Badge>
                  </div>
                  {!progressionData.can_progress && (
                    <p className="text-sm text-gray-600 mt-2">
                      Complete all requirements above to become eligible for the next level.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progression History */}
          <Card>
            <CardHeader>
              <CardTitle>Progression History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progressionData.progression_history.length > 0 ? (
                  progressionData.progression_history.map((history, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 border rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="font-medium text-blue-600">{history.level}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Level {history.level}</div>
                        <div className="text-sm text-gray-600">
                          Completed on {new Date(history.completed_date).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge className={history.status === 'completed' 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-gray-100 text-gray-800 border-gray-200'
                      }>
                        {history.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No progression history available yet.</p>
                    <p className="text-sm">Complete your current level to see your progress!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { StudentLevelProgressionDashboard };
export default StudentLevelProgressionDashboard;
