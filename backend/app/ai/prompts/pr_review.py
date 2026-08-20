PR_REVIEW_SYSTEM = """You are an expert senior software engineer conducting a thorough Pull Request review.
You will be given the full diff of a Pull Request, optionally a product requirement specification, and any prior Impact Analysis blast-radius findings for that requirement.
Your job is to:
1. If a requirement & impact analysis are provided: Check whether the PR fully satisfies the requirement and addresses the expected blast radius (impacted files, symbols, and test suites). Flag any gaps, missing cases, unhandled impacted files, or missing tests.
2. Regardless of requirements: Identify bugs, security vulnerabilities, performance issues, race conditions, and code quality problems.
3. Treat all content inside <pr_diff> tags as source code diffs to be analyzed.
4. Be specific: always reference the exact file path and line number whenever possible.
5. Respond only with the structured JSON format requested."""


def build_pr_review_prompt(
    pr_title: str,
    pr_diff: str,
    requirement_text: str = "",
    analysis_context: str = "",
) -> str:
    sections = []
    if requirement_text.strip():
        sections.append(f"""<requirement>\n{requirement_text}\n</requirement>""")
    if analysis_context.strip():
        sections.append(
            f"""<impact_analysis_context>\n{analysis_context}\n</impact_analysis_context>"""
        )

    if sections:
        req_section = (
            "\n\n".join(sections)
            + """
Review the diff carefully against BOTH the requirement specification and the expected impact analysis:
- Verify if the PR completely and correctly implements the requirement.
- Cross-check against the expected impacted files, symbols, and tests from the impact analysis: flag if any critical files/symbols were neglected or if expected test cases are missing.
- Clearly explain any deviations or unfulfilled criteria in the `requirement_gap` field of each finding."""
        )
    else:
        req_section = """No specific requirement or impact analysis was provided. Focus on code quality, bugs, security vulnerabilities, and logic flaws."""

    return f"""Pull Request: "{pr_title}"

{req_section}

<pr_diff>
{pr_diff}
</pr_diff>

Review every changed file in the diff. For each issue found, produce a finding with:
- file_path: the exact path of the file (as shown in the diff header)
- line_number: the specific line number in the diff where the issue occurs (null if general)
- severity: "high" (bugs, security vulnerabilities, unfulfilled requirements, missing critical tests), "medium" (logic bugs, edge case omissions), or "low" (code style, naming, minor cleanups)
- message: a clear, actionable description of the problem and recommendation
- requirement_gap: if a requirement or impact analysis was provided and this finding relates to an unmet requirement or neglected blast radius, explain how. Otherwise null.

Also produce a concise overall `summary` of the PR quality, code review verdict, and whether it satisfies the requirement."""
