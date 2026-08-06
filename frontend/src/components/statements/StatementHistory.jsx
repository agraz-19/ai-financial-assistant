import { motion } from "framer-motion";
import StatementCard from "./StatementCard";

export default function StatementHistory({
  statements,
  onViewStatement,
  onDeleteStatement,
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Upload History ({statements.length})
      </h2>

      {statements.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl">
          <p className="text-slate-500">No statements yet</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {statements.map((statement, index) => (
            <motion.div
              key={statement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <StatementCard
                statement={statement}
                onView={() => onViewStatement(statement.id)}
                onDelete={() => onDeleteStatement(statement.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
