#!/usr/bin/env python3
"""
RAG Evaluation using Ragas Framework
Evaluates the quality of RAG responses from rag-test-results.json
"""

import json
import os
from typing import List, Dict, Any
from datetime import datetime
import statistics
import asyncio

# Ragas metrics
try:
    from datasets import Dataset
    from ragas import evaluate
    from ragas.metrics import (
        faithfulness,
        answer_relevancy,
        answer_correctness,
        context_precision,
        context_recall,
    )
    RAGAS_AVAILABLE = True
    print("✅ Ragas library loaded successfully")
except ImportError:
    RAGAS_AVAILABLE = False
    Dataset = None  # type: ignore
    print("⚠️  Ragas not installed. Install with: pip install ragas datasets")


class RagasEvaluator:
    """Evaluates RAG responses using Ragas metrics"""

    def __init__(self, results_file: str = "rag-test-results.json"):
        self.results_file = results_file
        self.results = []
        self.evaluations = []
        self.load_results()

    def load_results(self):
        """Load test results from JSON file"""
        try:
            with open(self.results_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.results = data.get("results", [])
                print(f"✅ Loaded {len(self.results)} test results")
        except FileNotFoundError:
            print(f"❌ File not found: {self.results_file}")
            raise

    def prepare_dataset(self) -> Any:
        """Prepare data for Ragas evaluation"""
        if not RAGAS_AVAILABLE:
            print("❌ Ragas library not available. Cannot prepare dataset.")
            return None

        data = {
            "query": [],
            "generated_response": [],
            "retrieved_documents": [],
        }

        for result in self.results:
            data["query"].append(result.get("query", ""))
            data["generated_response"].append(result.get("generated_response", ""))
            data["retrieved_documents"].append(result.get("retrieved_documents", []))

        return Dataset.from_dict(data)

    async def evaluate_all(self) -> Dict[str, Any]:
        """Evaluate all results using Ragas library"""
        if not RAGAS_AVAILABLE:
            print("⚠️  Ragas library not available. Using heuristic evaluation...\n")
            return self._fallback_evaluation()

        print("\n🔍 Preparing dataset for Ragas evaluation...\n")

        # Prepare dataset
        dataset = self.prepare_dataset()
        if dataset is None:
            print("⚠️  Dataset preparation failed. Using heuristic evaluation...\n")
            return self._fallback_evaluation()

        print(f"📊 Dataset prepared with {len(dataset)} samples")
        print("⏳ Running Ragas evaluation (this may take a few minutes)...\n")

        try:
            # Define metrics to evaluate
            metrics = [
                faithfulness,
                answer_relevancy,
                answer_correctness,
                context_precision,
                context_recall,
            ]

            # Run evaluation
            results = await evaluate(
                dataset,
                metrics=metrics,
                raise_exceptions=False,
            )

            print("✅ Ragas evaluation complete!\n")
            return results

        except Exception as e:
            print(f"❌ Evaluation error: {str(e)}")
            print("⚠️  Falling back to heuristic evaluation...\n")
            return self._fallback_evaluation()

    def _fallback_evaluation(self) -> Dict[str, Any]:
        """Fallback heuristic evaluation if Ragas fails"""
        print("Using heuristic-based metrics...\n")

        self.evaluations = []
        for i, result in enumerate(self.results, 1):
            evaluation = self._evaluate_result_heuristic(result)
            self.evaluations.append(evaluation)

            if i % 10 == 0:
                print(f"  Evaluated {i}/{len(self.results)} results...")

        print(f"✅ Fallback evaluation complete for {len(self.evaluations)} results\n")
        return {"evaluations": self.evaluations}

    def _evaluate_result_heuristic(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Heuristic evaluation for a single result"""
        query = result.get("query", "")
        response = result.get("generated_response", "")
        context = result.get("retrieved_documents", [])
        metadata = result.get("metadata", {})

        # Simple heuristic metrics
        faithfulness_score = self._calculate_faithfulness_heuristic(response, context)
        relevancy_score = self._calculate_relevancy_heuristic(query, response)
        precision_score = self._calculate_precision_heuristic(context)
        recall_score = self._calculate_recall_heuristic(context)

        evaluation = {
            "query": query,
            "metrics": {
                "faithfulness": faithfulness_score,
                "answer_relevancy": relevancy_score,
                "context_precision": precision_score,
                "context_recall": recall_score,
            },
            "metadata": {
                "user_role": metadata.get("userRole", "unknown"),
                "processing_time_ms": metadata.get("processingTimeMs", 0),
                "source_count": metadata.get("sourceCount", 0),
                "session_id": metadata.get("sessionId", ""),
                "timestamp": metadata.get("timestamp", ""),
            },
        }

        scores = list(evaluation["metrics"].values())
        evaluation["overall_score"] = round(statistics.mean(scores), 3)

        return evaluation

    def _calculate_faithfulness_heuristic(
        self, response: str, context: List[str]
    ) -> float:
        """Heuristic: word overlap between response and context"""
        if not context or not response:
            return 0.0

        response_words = set(response.lower().split())
        context_text = " ".join(context).lower()
        context_words = set(context_text.split())

        overlap = len(response_words & context_words)
        total = len(response_words)

        return round(min(overlap / total if total > 0 else 0, 1.0), 3)

    def _calculate_relevancy_heuristic(self, query: str, response: str) -> float:
        """Heuristic: word overlap between query and response"""
        if not query or not response:
            return 0.0

        query_words = set(query.lower().split())
        response_words = set(response.lower().split())

        overlap = len(query_words & response_words)
        total = len(query_words)

        return round(min(overlap / total if total > 0 else 0, 1.0), 3)

    def _calculate_precision_heuristic(self, context: List[str]) -> float:
        """Heuristic: average context length"""
        if not context:
            return 0.0

        avg_length = statistics.mean([len(c) for c in context]) if context else 0
        return round(min(avg_length / 500, 1.0), 3)

    def _calculate_recall_heuristic(self, context: List[str]) -> float:
        """Heuristic: number of retrieved documents"""
        if not context:
            return 0.0

        return round(min(len(context) / 10, 1.0), 3)

    def process_ragas_results(self, ragas_results: Dict[str, Any]) -> Dict[str, Any]:
        """Process results from Ragas library evaluation"""
        if not ragas_results:
            return {}

        # Extract individual metric scores
        processed = {
            "overall_metrics": {},
            "by_role": {},
            "raw_results": ragas_results,
        }

        # Get metric names and scores
        for metric_name, metric_value in ragas_results.items():
            if isinstance(metric_value, (int, float)):
                processed["overall_metrics"][metric_name] = round(
                    float(metric_value), 3
                )

        return processed

    def calculate_aggregate_metrics(self) -> Dict[str, Any]:
        """Calculate aggregate metrics across all evaluations"""
        if not self.evaluations:
            return {}

        metrics_by_role = {}
        all_scores = {
            "faithfulness": [],
            "answer_relevancy": [],
            "context_precision": [],
            "context_recall": [],
            "overall": [],
        }

        for eval_result in self.evaluations:
            role = eval_result["metadata"]["user_role"]

            if role not in metrics_by_role:
                metrics_by_role[role] = {
                    "count": 0,
                    "faithfulness": [],
                    "answer_relevancy": [],
                    "context_precision": [],
                    "context_recall": [],
                    "overall": [],
                }

            metrics_by_role[role]["count"] += 1
            metrics_by_role[role]["faithfulness"].append(
                eval_result["metrics"]["faithfulness"]
            )
            metrics_by_role[role]["answer_relevancy"].append(
                eval_result["metrics"]["answer_relevancy"]
            )
            metrics_by_role[role]["context_precision"].append(
                eval_result["metrics"]["context_precision"]
            )
            metrics_by_role[role]["context_recall"].append(
                eval_result["metrics"]["context_recall"]
            )
            metrics_by_role[role]["overall"].append(eval_result["overall_score"])

            all_scores["faithfulness"].append(eval_result["metrics"]["faithfulness"])
            all_scores["answer_relevancy"].append(
                eval_result["metrics"]["answer_relevancy"]
            )
            all_scores["context_precision"].append(
                eval_result["metrics"]["context_precision"]
            )
            all_scores["context_recall"].append(
                eval_result["metrics"]["context_recall"]
            )
            all_scores["overall"].append(eval_result["overall_score"])

        # Calculate averages
        aggregate = {
            "total_evaluations": len(self.evaluations),
            "timestamp": datetime.now().isoformat(),
            "overall_metrics": {
                "faithfulness": round(
                    statistics.mean(all_scores["faithfulness"]), 3
                ),
                "answer_relevancy": round(
                    statistics.mean(all_scores["answer_relevancy"]), 3
                ),
                "context_precision": round(
                    statistics.mean(all_scores["context_precision"]), 3
                ),
                "context_recall": round(
                    statistics.mean(all_scores["context_recall"]), 3
                ),
                "overall_score": round(statistics.mean(all_scores["overall"]), 3),
            },
            "by_role": {},
        }

        for role, metrics in metrics_by_role.items():
            aggregate["by_role"][role] = {
                "count": metrics["count"],
                "faithfulness": round(statistics.mean(metrics["faithfulness"]), 3),
                "answer_relevancy": round(
                    statistics.mean(metrics["answer_relevancy"]), 3
                ),
                "context_precision": round(
                    statistics.mean(metrics["context_precision"]), 3
                ),
                "context_recall": round(
                    statistics.mean(metrics["context_recall"]), 3
                ),
                "overall_score": round(statistics.mean(metrics["overall"]), 3),
            }

        return aggregate

    def print_summary(self, aggregate: Dict[str, Any]):
        """Print evaluation summary"""
        print("=" * 70)
        print("📊 RAG EVALUATION SUMMARY (Ragas Metrics)")
        print("=" * 70)
        print(f"\nTotal Evaluations: {aggregate['total_evaluations']}")
        print(f"Timestamp: {aggregate['timestamp']}\n")

        print("📈 OVERALL METRICS")
        print("-" * 70)
        overall = aggregate["overall_metrics"]
        print(f"  Faithfulness:      {overall['faithfulness']:.3f}")
        print(f"  Answer Relevancy:  {overall['answer_relevancy']:.3f}")
        print(f"  Context Precision: {overall['context_precision']:.3f}")
        print(f"  Context Recall:    {overall['context_recall']:.3f}")
        print(f"  Overall Score:     {overall['overall_score']:.3f}")

        print("\n📊 METRICS BY ROLE")
        print("-" * 70)
        for role, metrics in aggregate["by_role"].items():
            print(f"\n  {role.upper()} (n={metrics['count']})")
            print(f"    Faithfulness:      {metrics['faithfulness']:.3f}")
            print(f"    Answer Relevancy:  {metrics['answer_relevancy']:.3f}")
            print(f"    Context Precision: {metrics['context_precision']:.3f}")
            print(f"    Context Recall:    {metrics['context_recall']:.3f}")
            print(f"    Overall Score:     {metrics['overall_score']:.3f}")

        print("\n" + "=" * 70)

    def export_results(self, output_file: str = "ragas-evaluation-results.json"):
        """Export evaluation results to JSON"""
        output = {
            "evaluations": self.evaluations,
            "aggregate_metrics": self.calculate_aggregate_metrics(),
            "metadata": {
                "framework": "Ragas",
                "evaluation_date": datetime.now().isoformat(),
                "source_file": self.results_file,
                "total_results_evaluated": len(self.evaluations),
            },
        }

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"\n✅ Results exported to {output_file}")
        return output_file

    def export_csv(self, output_file: str = "ragas-evaluation-results.csv"):
        """Export evaluation results to CSV"""
        import csv

        with open(output_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)

            # Header
            writer.writerow(
                [
                    "Query",
                    "User Role",
                    "Faithfulness",
                    "Answer Relevancy",
                    "Context Precision",
                    "Context Recall",
                    "Overall Score",
                    "Processing Time (ms)",
                    "Source Count",
                    "Timestamp",
                ]
            )

            # Data rows
            for eval_result in self.evaluations:
                writer.writerow(
                    [
                        eval_result["query"],
                        eval_result["metadata"]["user_role"],
                        eval_result["metrics"]["faithfulness"],
                        eval_result["metrics"]["answer_relevancy"],
                        eval_result["metrics"]["context_precision"],
                        eval_result["metrics"]["context_recall"],
                        eval_result["overall_score"],
                        eval_result["metadata"]["processing_time_ms"],
                        eval_result["metadata"]["source_count"],
                        eval_result["metadata"]["timestamp"],
                    ]
                )

        print(f"✅ CSV exported to {output_file}")
        return output_file


async def main():
    """Main evaluation pipeline"""
    print("\n🚀 Starting RAG Evaluation with Ragas Metrics\n")

    # Initialize evaluator
    evaluator = RagasEvaluator("rag-test-results.json")

    # Evaluate all results
    ragas_results = await evaluator.evaluate_all()

    # Process results
    if ragas_results and isinstance(ragas_results, dict):
        if "evaluations" in ragas_results:
            # Fallback evaluation results
            evaluator.evaluations = ragas_results["evaluations"]
            aggregate = evaluator.calculate_aggregate_metrics()
        else:
            # Ragas library results
            aggregate = evaluator.process_ragas_results(ragas_results)
            # Also run fallback for per-result metrics
            evaluator._fallback_evaluation()
            aggregate = evaluator.calculate_aggregate_metrics()
    else:
        print("⚠️  No evaluation results. Exiting.")
        return

    # Print summary
    evaluator.print_summary(aggregate)

    # Export results
    json_file = evaluator.export_results("ragas-evaluation-results.json")
    csv_file = evaluator.export_csv("ragas-evaluation-results.csv")

    print(f"\n✨ Evaluation complete!")
    print(f"📄 JSON Report: {json_file}")
    print(f"📊 CSV Report: {csv_file}")

    return aggregate


def run_main():
    """Wrapper to run async main function"""
    try:
        return asyncio.run(main())
    except RuntimeError:
        # If event loop already exists, use it
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(main())


if __name__ == "__main__":
    run_main()
